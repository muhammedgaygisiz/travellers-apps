import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Authentication is not authorization, and a callable is the one place where
 * the difference is invisible from the outside: it runs with admin credentials,
 * so no Firestore rule constrains what it does. Until issue #1472 only the two
 * callables written after the role existed checked it, and
 * `verifyRestaurantCandidate` - the callable that creates a restaurant - would
 * run for any BiteTribe account that found it.
 *
 * The fix is one line per callable, so the durable part is this list. Every
 * HTTP endpoint in the functions source has to be named here with the decision
 * that was made about it, and the decision has to match what the source does.
 * A new callable fails the build until someone classifies it.
 */

type Access =
  /** Requires the `admin` role: a BiteTribe operator action. */
  | 'operator'
  /**
   * Requires `business` or `admin`, and then decides for itself which
   * restaurants that reaches.
   *
   * The second half is the part a classification cannot check, so this class
   * is deliberately narrow: it is for a callable that acts on one restaurant
   * and reads the authority off `Restaurant.ownerUserId` (issue #1537). An
   * operator is admitted alongside the owner by `RD-UR-6`, and that is a
   * decision per callable rather than a property of the `business` role.
   */
  | 'restaurantAuthority'
  /** Requires a session, and does the same thing for every account. */
  | 'authenticated'
  /** Deliberately reachable without a session. */
  | 'public';

const ACCESS_BY_ENDPOINT: Record<string, Access> = {
  // Operator actions. Each one writes or spends on behalf of the whole
  // product, and each is reachable only from the admin app.
  assignRestaurantOwner: 'operator',
  backfillBiteAddress: 'operator',
  backfillReviewTimestampsCallable: 'operator',
  clusterRestaurantCandidateForBite: 'operator',
  deleteBiteAsOperator: 'operator',
  listUsersWithRoles: 'operator',
  revokeRestaurantOwner: 'operator',
  sendNewVersionNotification: 'operator',
  setUserBlocked: 'operator',
  setUserRoles: 'operator',
  setUserSubscriptionTier: 'operator',
  verifyRestaurantCandidate: 'operator',

  // A restaurant acting on its own staff, and an operator acting on any
  // restaurant's. Not `operator`: widening those callables to `admin` only
  // would put a restaurant back on a support conversation for every hire.
  addRestaurantStaff: 'restaurantAuthority',
  listRestaurantStaff: 'restaurantAuthority',
  removeRestaurantStaff: 'restaurantAuthority',

  // Consumer and business app paths. Each acts for the caller, or reads data
  // every signed-in account may read, so requiring `admin` here would break
  // the consumer app.
  checkDisplayNameAvailability: 'authenticated',
  claimDisplayName: 'authenticated',
  deleteOwnAccount: 'authenticated',
  getCurrencyByPosition: 'authenticated',
  getPlaceDetails: 'authenticated',
  loadBitesByLocation: 'authenticated',
  loadLeaderboard: 'authenticated',
  loadWeeklyBites: 'authenticated',
  resendEmailVerification: 'authenticated',
  searchBites: 'authenticated',
  searchBitesByCity: 'authenticated',
  searchBitesByCountry: 'authenticated',
  searchNearbyPlaces: 'authenticated',
  searchPlaces: 'authenticated',
  searchRestaurants: 'authenticated',
  searchUsers: 'authenticated',
  syncEmailVerificationStatus: 'authenticated',
  updateLastSeen: 'authenticated',
  updateUserMetadata: 'authenticated',

  // The redirect target of a shared Bite link. It is opened by whoever was
  // sent the link, which is the point of sharing one.
  handleSharedLinkToBite: 'public',
};

const FUNCTIONS_ROOT = join(__dirname, '..', 'functions');

interface Endpoint {
  name: string;
  file: string;
}

const listTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return entry === '__specs__' ? [] : listTypeScriptFiles(path);
    }

    return entry.endsWith('.ts') ? [path] : [];
  });

/**
 * Finds the HTTP entry points a client can address. Firestore, storage, auth
 * and schedule triggers are left out: nothing a client sends reaches them, so
 * there is no caller to authorize.
 */
const findEndpoints = (file: string): Endpoint[] => {
  const source = readFileSync(file, 'utf8').replace(/\s+/g, ' ');
  const pattern =
    /export const ([A-Za-z0-9_$]+) *= *(?:onAppCheck|onCall|onRequest) *[<(]/g;

  return [...source.matchAll(pattern)].map((match) => ({
    name: match[1],
    file,
  }));
};

const sourceOf = (file: string): string => readFileSync(file, 'utf8');

describe('callable authorization', () => {
  const endpoints = listTypeScriptFiles(FUNCTIONS_ROOT).flatMap(findEndpoints);

  const named = (access: Access): Endpoint[] =>
    endpoints.filter(
      (endpoint) => ACCESS_BY_ENDPOINT[endpoint.name] === access,
    );

  it('finds the HTTP endpoints in the functions source', () => {
    expect(endpoints.length).toBeGreaterThan(20);
  });

  it('classifies every endpoint', () => {
    const unclassified = endpoints
      .filter((endpoint) => !ACCESS_BY_ENDPOINT[endpoint.name])
      .map((endpoint) => endpoint.name);

    expect(unclassified).toEqual([]);
  });

  it('names no endpoint that no longer exists', () => {
    const existing = new Set(endpoints.map((endpoint) => endpoint.name));
    const stale = Object.keys(ACCESS_BY_ENDPOINT).filter(
      (name) => !existing.has(name),
    );

    expect(stale).toEqual([]);
  });

  it('guards every operator endpoint with requireAdmin', () => {
    const unguarded = named('operator')
      .filter((endpoint) => !sourceOf(endpoint.file).includes('requireAdmin('))
      .map((endpoint) => endpoint.name);

    expect(unguarded).toEqual([]);
  });

  // The consumer app is the thing this test protects. A callable it depends on
  // that quietly starts requiring `admin` breaks the app for every user.
  it('requires no role of an endpoint the apps call as any signed-in user', () => {
    const overGuarded = [...named('authenticated'), ...named('public')]
      .filter((endpoint) => sourceOf(endpoint.file).includes('requireAdmin('))
      .map((endpoint) => endpoint.name);

    expect(overGuarded).toEqual([]);
  });

  it('guards every restaurant-authority endpoint with requireAnyRole', () => {
    const unguarded = named('restaurantAuthority')
      .filter(
        (endpoint) => !sourceOf(endpoint.file).includes('requireAnyRole('),
      )
      .map((endpoint) => endpoint.name);

    expect(unguarded).toEqual([]);
  });

  /**
   * `requireAdmin` on one of these would take the restaurant owner off its own
   * staff surface and leave only the operator - which is the support
   * conversation issue #1537 exists to remove.
   */
  it('admits more than an operator on every restaurant-authority endpoint', () => {
    const operatorOnly = named('restaurantAuthority')
      .filter((endpoint) => sourceOf(endpoint.file).includes('requireAdmin('))
      .map((endpoint) => endpoint.name);

    expect(operatorOnly).toEqual([]);
  });

  // `firebase-admin/auth` pulls in `jose`, which is ESM only, so a spec that
  // reaches a module importing it fails to parse under ts-jest unless it mocks
  // the SDK. Every operator callable imports the guard, so the guard importing
  // the SDK would put that mock in every one of their specs - and the failure
  // only shows up on a clean install, which is CI.
  it('keeps the guard free of the Firebase Admin SDK', () => {
    const guard = readFileSync(
      join(FUNCTIONS_ROOT, 'shared', 'roles.ts'),
      'utf8',
    );

    expect(guard).not.toMatch(/from 'firebase-admin\//);
  });

  it('rejects a request without a session on every non-public endpoint', () => {
    const unchecked = [
      ...named('operator'),
      ...named('restaurantAuthority'),
      ...named('authenticated'),
    ]
      .filter((endpoint) => {
        const source = sourceOf(endpoint.file);

        return (
          !source.includes('requireAdmin(') &&
          !source.includes('requireAnyRole(') &&
          !source.includes('!request.auth')
        );
      })
      .map((endpoint) => endpoint.name);

    expect(unchecked).toEqual([]);
  });
});
