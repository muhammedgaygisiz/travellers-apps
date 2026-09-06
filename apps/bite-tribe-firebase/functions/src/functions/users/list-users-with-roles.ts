import { getAuth, UserRecord } from 'firebase-admin/auth';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { BiteTribeRole, isBiteTribeRole, requireAdmin } from '../shared/roles';

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 1000;

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

const toSummary = (user: UserRecord): AdminUserSummary => ({
  uid: user.uid,
  email: user.email ?? '',
  displayName: user.displayName ?? '',
  roles: rolesOfRecord(user),
  disabled: user.disabled,
  emailVerified: user.emailVerified,
  providerIds: user.providerData.map((provider) => provider.providerId),
  createdAt: user.metadata.creationTime ?? '',
  lastSignInAt: user.metadata.lastSignInTime ?? '',
});

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
 * The admin app's user management reads this. It goes to Firebase Auth rather
 * than to the `/users` collection because **roles are custom claims, not
 * documents** — `searchUsers` cannot answer "who is an admin" at all, and an
 * account that never completed profile creation has no user document to find.
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

  return {
    users: page.users.map(toSummary),
    ...(page.pageToken ? { nextPageToken: page.pageToken } : {}),
  };
};

export const listUsersWithRoles = onAppCheck<ListUsersWithRolesRequest>(
  listUsersWithRolesHandler,
);
