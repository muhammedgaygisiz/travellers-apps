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
  /**
   * Requires `staff`, `business` or `admin`, and then decides for itself which
   * restaurant that reaches (issue #1092).
   *
   * A wider door than `restaurantAuthority`, onto a narrower room. It is the
   * only class a `staff` account may enter, and what lies behind it is live
   * table state: a host seats and frees tables and cannot touch the floor plan,
   * the QR codes or the staff list. A staff account reaches its restaurant
   * through `/restaurantStaff/{uid}` and never through the role alone, which is
   * the same pair `worksAt()` in `firestore.rules` checks.
   */
  | 'staffAuthority'
  /** Requires a session, and does the same thing for every account. */
  | 'authenticated'
  /** Deliberately reachable without a session. */
  | 'public';

const ACCESS_BY_ENDPOINT: Record<string, Access> = {
  // Operator actions. Each one writes or spends on behalf of the whole
  // product, and each is reachable only from the admin app.
  assignRestaurantOwner: 'operator',
  backfillBiteAddress: 'operator',
  backfillMenuItemIdsCallable: 'operator',
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

  // A restaurant printing and reprinting the QR codes of its own tables
  // (issue #1086). Same shape and same reason: an owner who has to open a
  // support ticket to replace a photographed code will keep using the
  // photographed code.
  issueTableQrTokens: 'restaurantAuthority',
  rotateTableQrToken: 'restaurantAuthority',

  // A restaurant operating its own dining room during service (issue #1092).
  // Not `restaurantAuthority`: the caller is usually a host rather than the
  // account the restaurant is assigned to, and requiring `business` here would
  // mean the owner's own login being passed round the floor.
  transitionTableState: 'staffAuthority',

  // Moving an order along the kitchen's own lifecycle (issue #1105). The same
  // door as a table transition and for the same reason: whoever is working the
  // pass presses Accept, and that is a host or a chef rather than the account
  // the restaurant is assigned to.
  transitionTableOrderStatus: 'staffAuthority',

  // Walking a party to another table while keeping its visit (issue #1095).
  // Same door and same room: it is the host's job, and it writes live state
  // and the visit that hangs from it and nothing else.
  moveTableVisit: 'staffAuthority',

  // Clearing the signal a guest raised from their table (issue #1106). The
  // same door again: answering a table is the job of whoever is on the floor,
  // and the callable decides for itself which restaurant each caller reaches.
  acknowledgeTableAssistance: 'staffAuthority',

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

  // A guest attaching to, or leaving, the party at a table they scanned
  // (issue #1101). `authenticated` rather than `public`, and the only two
  // callables for which an *anonymous* session is enough: a session has to
  // belong to somebody, or the guest's phone could not read it back through
  // the rules and `linkWith*` could not turn it into an account later without
  // the session changing hands. What the door opens onto is one document named
  // after the caller's own uid - neither callable takes a `guestUserId`, and
  // the restaurant, table and visit all come from a token the caller had to
  // hold, checked against the twelve rules of issue #1100.
  startTableSession: 'authenticated',
  leaveTableSession: 'authenticated',

  // A guest sending the order they built to the kitchen (issue #1103). The
  // same door and the same reason: the session it writes against is named
  // after the caller's own uid, the visit comes off that session, the table
  // comes off that visit, and every price comes off the restaurant's own menu.
  // There is nothing in the request a caller could choose that would reach
  // another party's dinner.
  submitTableOrder: 'authenticated',

  // A guest asking for a waiter or for the bill (issue #1106). The fourth
  // callable an anonymous session is enough for, and the narrowest of them:
  // the request carries a restaurant, the table the caller scanned and one of
  // two kinds, and everything else - the visit, the table the marker is drawn
  // on, who asked - comes off the session named after the caller's own uid.
  requestTableAssistance: 'authenticated',

  // The redirect target of a shared Bite link. It is opened by whoever was
  // sent the link, which is the point of sharing one.
  handleSharedLinkToBite: 'public',

  // The scan of a table QR code (issue #1100). Public because a guest at a
  // table has no BiteTribe account and may never want one, and the scan is
  // what establishes which restaurant they would be signing in to - so an
  // auth requirement here would make the account a precondition of finding
  // out whether the restaurant even takes orders at the table. It writes
  // nothing, and it assembles its answer field by field rather than handing
  // back the documents it read.
  resolveTableQrToken: 'public',

  // A restaurant's menu, read without an account (issue #1102). `public` for
  // the reason issues #370 and #371 state outright: the guest is reading a menu
  // on a phone, with no download and no sign-up. It writes nothing, and it
  // assembles both the restaurant and the menu field by field rather than
  // handing back the documents it read - the restaurant document carries
  // ownership and ordering configuration a reader is not entitled to.
  loadPublicMenu: 'public',
};

const FUNCTIONS_ROOT = join(__dirname, '..', 'functions');

/**
 * The shared guard the restaurant-authority endpoints reach `requireAnyRole`
 * through (issue #1086).
 *
 * Until then the guard was inline in `restaurant-staff.ts` and this file could
 * look for `requireAnyRole(` in the endpoint's own source. A second surface
 * asking the same question - may this caller act on this restaurant - made a
 * second copy of that answer the greater risk, so the decision was extracted
 * and the checks below follow it one hop.
 *
 * The hop is not a hole: `guards the shared restaurant authority with
 * requireAnyRole` asserts that the extracted module is itself the guard it
 * claims to be, so an endpoint calling it cannot be admitting anyone the
 * inline version would not have.
 */
const RESTAURANT_AUTHORITY_MODULE = join(
  FUNCTIONS_ROOT,
  'restaurants',
  'restaurant-authority.ts',
);

const RESTAURANT_AUTHORITY_GUARDS = [
  'requireAnyRole(',
  'requireRestaurantAuthority(',
];

/**
 * The staff-authority guard, in the same shared module and checked the same
 * way (issue #1092).
 *
 * It is deliberately a *different* function from `requireRestaurantAuthority`
 * rather than that one with a wider role list, because the two answer different
 * questions - may you configure this restaurant, and may you operate it during
 * service. One function taking a role list would put that difference in an
 * argument at each call site, and the call site that got it wrong would be the
 * one that handed a host the QR rotation. Naming them separately here is what
 * makes an endpoint that reaches for the wrong one visible.
 */
const STAFF_AUTHORITY_GUARDS = ['requireTableStateAuthority('];

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
        (endpoint) =>
          !RESTAURANT_AUTHORITY_GUARDS.some((guard) =>
            sourceOf(endpoint.file).includes(guard),
          ),
      )
      .map((endpoint) => endpoint.name);

    expect(unguarded).toEqual([]);
  });

  it('guards every staff-authority endpoint with requireTableStateAuthority', () => {
    const unguarded = named('staffAuthority')
      .filter(
        (endpoint) =>
          !STAFF_AUTHORITY_GUARDS.some((guard) =>
            sourceOf(endpoint.file).includes(guard),
          ),
      )
      .map((endpoint) => endpoint.name);

    expect(unguarded).toEqual([]);
  });

  /**
   * The staff guard is the one place in this project where the `staff` role
   * reaches a write. If it ever stopped checking the association, the role
   * would become a key to every dining room in BiteTribe - the shape of hole
   * issue #1537 closed for the restaurant document.
   */
  it('scopes the staff authority to the caller association and not to the role', () => {
    const authority = sourceOf(RESTAURANT_AUTHORITY_MODULE);

    expect(authority).toContain('requireTableStateAuthority');
    expect(authority).toContain('RESTAURANT_STAFF_COLLECTION');
    expect(authority).toContain("hasRole(request, 'staff')");
  });

  it('guards the shared restaurant authority with requireAnyRole', () => {
    expect(sourceOf(RESTAURANT_AUTHORITY_MODULE)).toContain('requireAnyRole(');
  });

  /**
   * `requireAdmin` on one of these would take the restaurant owner off its own
   * staff surface and leave only the operator - which is the support
   * conversation issue #1537 exists to remove.
   */
  it('admits more than an operator on every restaurant-authority endpoint', () => {
    const operatorOnly = [
      ...named('restaurantAuthority'),
      ...named('staffAuthority'),
    ]
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
      ...named('staffAuthority'),
      ...named('authenticated'),
    ]
      .filter((endpoint) => {
        const source = sourceOf(endpoint.file);

        return (
          !source.includes('requireAdmin(') &&
          ![...RESTAURANT_AUTHORITY_GUARDS, ...STAFF_AUTHORITY_GUARDS].some(
            (guard) => source.includes(guard),
          ) &&
          !source.includes('!request.auth')
        );
      })
      .map((endpoint) => endpoint.name);

    expect(unchecked).toEqual([]);
  });
});
