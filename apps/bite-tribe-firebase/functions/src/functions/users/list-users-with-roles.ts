import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { BiteTribeRole, isBiteTribeRole, requireAdmin } from '../shared/roles';
import {
  SubscriptionTier,
  tierFromUserData,
} from '../shared/subscription-tier';

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 1000;
const USERS_COLLECTION = 'users';

/**
 * How many `/users` documents one `getAll` asks for.
 *
 * A page of accounts can be 1000, and one `getAll` of that size is a single
 * request holding a thousand documents in memory at once. Chunking keeps the
 * join to a handful of round trips without turning it into one read per
 * account.
 */
const PROFILE_LOOKUP_CHUNK = 300;

interface ListUsersWithRolesRequest {
  pageToken?: unknown;
  limit?: unknown;
}

export interface AdminUserSummary {
  uid: string;
  email: string;
  displayName: string;
  roles: BiteTribeRole[];
  disabled: boolean;
  emailVerified: boolean;
  providerIds: string[];
  createdAt: string;
  lastSignInAt: string;
  subscriptionTier: SubscriptionTier | null;
}

export interface ListUsersWithRolesResult {
  users: AdminUserSummary[];
  nextPageToken?: string;
}

/**
 * Reads the roles off a `UserRecord`.
 *
 * `customClaims` is whatever was written there, so a shape that is not an array
 * of known roles resolves to "no roles" rather than reaching the client as
 * something it has to defend against.
 */
const rolesOfRecord = (user: UserRecord): BiteTribeRole[] => {
  const raw = user.customClaims?.['roles'];

  return Array.isArray(raw) ? raw.filter(isBiteTribeRole) : [];
};

/**
 * The stored display name wins over the Auth one.
 *
 * They disagree for a federated account: Firebase copies the provider's name
 * into the Auth record at creation, and the account may have chosen a different
 * BiteTribe display name since. The stored one is what the account is called
 * everywhere in the product and therefore what an operator was told to look
 * for; the Auth one is the fallback for an account with no `/users` document.
 */
const toSummary = (
  user: UserRecord,
  profile: StoredProfile | undefined,
): AdminUserSummary => ({
  uid: user.uid,
  email: user.email ?? '',
  displayName: profile?.displayName || (user.displayName ?? ''),
  roles: rolesOfRecord(user),
  disabled: user.disabled,
  emailVerified: user.emailVerified,
  providerIds: user.providerData.map((provider) => provider.providerId),
  createdAt: user.metadata.creationTime ?? '',
  lastSignInAt: user.metadata.lastSignInTime ?? '',
  subscriptionTier: profile?.subscriptionTier ?? null,
});

/** What the `/users` document adds to the Firebase Auth record. */
interface StoredProfile {
  displayName: string;
  subscriptionTier: SubscriptionTier | null;
}

/**
 * Joins the `/users` document onto a page of accounts.
 *
 * Two of the fields an operator searches on do **not** live in Firebase Auth.
 * `subscriptionTier` is a field on the `/users` document, and so is the display
 * name: BiteTribe writes the name only to `/users` and `/displayNames`
 * (`claimDisplayName`), never back to the Auth record, so `UserRecord.displayName`
 * is empty for every email/password account and holds the provider's name for a
 * federated one. Listing accounts from Auth alone therefore cannot be searched
 * by the name an operator was given (issue #1476).
 *
 * The join happens once per page rather than once per account opened, so an
 * operator scanning or filtering the list sees both without a click.
 *
 * An account with no `/users` document maps to no tier and no stored name, and
 * the tier stays `null` rather than becoming Free. A federated account that
 * never completed profile creation is exactly that case, and showing it as Free
 * would present an absence as a decision.
 */
const readProfiles = async (
  uids: string[],
): Promise<Map<string, StoredProfile>> => {
  const firestore = getFirestore();
  const users = firestore.collection(USERS_COLLECTION);
  const profiles = new Map<string, StoredProfile>();

  for (let start = 0; start < uids.length; start += PROFILE_LOOKUP_CHUNK) {
    const refs = uids
      .slice(start, start + PROFILE_LOOKUP_CHUNK)
      .map((uid) => users.doc(uid));
    const snapshots = await firestore.getAll(...refs);

    snapshots.forEach((snapshot) => {
      const data = snapshot.exists ? snapshot.data() : undefined;
      const storedName = data?.['displayName'];

      profiles.set(snapshot.id, {
        displayName: typeof storedName === 'string' ? storedName : '',
        subscriptionTier: tierFromUserData(data),
      });
    });
  }

  return profiles;
};

const parseLimit = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new HttpsError(
      'invalid-argument',
      'limit must be a positive integer.',
    );
  }

  return Math.min(value, MAX_PAGE_SIZE);
};

/**
 * Lists BiteTribe accounts with the roles they hold.
 *
 * The admin app's user management reads this. The account list itself comes
 * from Firebase Auth rather than from the `/users` collection because **roles
 * are custom claims, not documents** — `searchUsers` cannot answer "who is an
 * admin" at all, and an account that never completed profile creation has no
 * user document to find.
 *
 * The subscription tier and the display name are the exceptions and are joined
 * from `/users`, because that is where they live. An account present in Auth
 * and absent from Firestore therefore appears in this list with a `null` tier
 * and whatever name Auth holds, rather than not at all (issues #1485, #1476).
 *
 * The admin app filters this list rather than calling `searchUsers`. That is
 * what makes an operator's account search see private profiles and accounts
 * with no `/users` document at all, without touching the consumer-facing
 * callable or its public-flag filter (issue #1476).
 *
 * Admin-only, like every role surface. Listing every account with its access
 * level is exactly the inventory an attacker would want first.
 *
 * `listUsers` pages at up to 1000. The page token is passed straight back to
 * the caller rather than the whole list being assembled here, so a project with
 * more accounts than one page does not turn one call into an unbounded loop
 * inside a callable.
 */
export const listUsersWithRolesHandler = async (
  request: CallableRequest<ListUsersWithRolesRequest>,
): Promise<ListUsersWithRolesResult> => {
  requireAdmin(request);

  const limit = parseLimit(request.data?.limit);
  const pageToken =
    typeof request.data?.pageToken === 'string' && request.data.pageToken
      ? request.data.pageToken
      : undefined;

  const page = await getAuth().listUsers(limit, pageToken);
  const profiles = await readProfiles(page.users.map((user) => user.uid));

  return {
    users: page.users.map((user) => toSummary(user, profiles.get(user.uid))),
    ...(page.pageToken ? { nextPageToken: page.pageToken } : {}),
  };
};

export const listUsersWithRoles = onAppCheck<ListUsersWithRolesRequest>(
  listUsersWithRolesHandler,
);
