import { getAuth } from 'firebase-admin/auth';
import { CallableRequest, HttpsError } from 'firebase-functions/https';

/**
 * The roles BiteTribe grants to an account beyond "is signed in".
 *
 * This list is deliberately duplicated from `libs/common/utils/src/lib/user-role.ts`
 * rather than imported. The Functions project compiles with its own
 * `tsconfig.json` whose `rootDir` is `src` and which carries none of the
 * workspace path mappings, so it cannot reach a library. The duplication is the
 * existing shape of every shared constant in this project; the two lists have
 * to be changed together.
 */
export const BITE_TRIBE_ROLES = ['admin', 'business'] as const;

export type BiteTribeRole = (typeof BITE_TRIBE_ROLES)[number];

/**
 * The custom-claim key the roles are stored under.
 *
 * Firebase caps the whole custom-claim payload at 1000 bytes and reserves a
 * fixed set of claim names, so the roles live in one array under one key.
 */
export const ROLES_CLAIM = 'roles';

export const isBiteTribeRole = (value: unknown): value is BiteTribeRole =>
  typeof value === 'string' &&
  (BITE_TRIBE_ROLES as readonly string[]).includes(value);

/**
 * Reads the roles out of a verified ID token.
 *
 * `request.auth.token` is the decoded token Firebase has already verified, so
 * what it says about the caller is trustworthy in a way the client's own claim
 * to a role is not.
 */
export const rolesOf = (request: CallableRequest<unknown>): BiteTribeRole[] => {
  const raw = request.auth?.token?.[ROLES_CLAIM];

  return Array.isArray(raw) ? raw.filter(isBiteTribeRole) : [];
};

export const hasRole = (
  request: CallableRequest<unknown>,
  role: BiteTribeRole,
): boolean => rolesOf(request).includes(role);

/**
 * Rejects any caller that is not a BiteTribe operator.
 *
 * The two failures are separated on purpose: `unauthenticated` means "sign in",
 * `permission-denied` means "signing in will not help". Collapsing them into
 * one would send a business account that reached an admin callable back through
 * a login it has already completed.
 */
export const requireAdmin = (request: CallableRequest<unknown>): string => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to perform this operation.',
    );
  }

  if (!hasRole(request, 'admin')) {
    throw new HttpsError(
      'permission-denied',
      'This operation requires the admin role.',
    );
  }

  return request.auth.uid;
};

/**
 * Replaces an account's roles, preserving every other custom claim it carries.
 *
 * `setCustomUserClaims` overwrites the whole claim object rather than merging
 * into it, so the existing claims are read first. Writing only `{ roles }`
 * would silently drop anything else a future feature stores there.
 *
 * The write takes effect in a client on its next token refresh, which Firebase
 * performs at most hourly on its own — the client forces one when a role check
 * misses, so a grant is visible without signing out and back in.
 */
export const setRoles = async (
  uid: string,
  roles: BiteTribeRole[],
): Promise<BiteTribeRole[]> => {
  const auth = getAuth();
  const user = await auth.getUser(uid);
  const uniqueRoles = [...new Set(roles)];

  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    [ROLES_CLAIM]: uniqueRoles,
  });

  return uniqueRoles;
};
