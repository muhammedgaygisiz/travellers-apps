import { CallableRequest, HttpsError } from 'firebase-functions/https';

/**
 * The guard is deliberately free of the Firebase Admin SDK.
 *
 * `firebase-admin/auth` pulls in `jose`, which ships as ESM only, and every
 * spec that reaches a module importing it has to mock the SDK or fail to parse
 * under ts-jest. This module is imported by every operator callable, so the
 * writer that does need the SDK lives next to its own callable in
 * `users/set-user-roles.ts` instead. Keep it that way: the alternative is a
 * mock in every callable's spec, added only after CI fails.
 */

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
export const BITE_TRIBE_ROLES = ['admin', 'business', 'staff'] as const;

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
 * Rejects any caller that does not hold `role`, and returns the caller's uid.
 *
 * The two failures are separated on purpose: `unauthenticated` means "sign in",
 * `permission-denied` means "signing in will not help". Collapsing them into
 * one would send a business account that reached an admin callable back through
 * a login it has already completed.
 *
 * The message names the role rather than the operation. A callable is reached
 * by our own apps, so there is nothing to withhold from the caller — unlike the
 * *login* refusal, which is deliberately generic so a rejected account cannot
 * learn which role guards the app (see `Architecture - Auth`).
 */
export const requireRole = (
  request: CallableRequest<unknown>,
  role: BiteTribeRole,
): string => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to perform this operation.',
    );
  }

  if (!hasRole(request, role)) {
    throw new HttpsError(
      'permission-denied',
      `This operation requires the ${role} role.`,
    );
  }

  return request.auth.uid;
};

/**
 * Rejects any caller that is not a BiteTribe operator.
 *
 * Kept as its own name rather than folded into {@link requireRole}: it is what
 * every operator callable calls, it is what `callable-authorization.spec.ts`
 * greps for to prove an operator endpoint is guarded, and "requires admin" is
 * the claim being made at each of those call sites.
 */
export const requireAdmin = (request: CallableRequest<unknown>): string =>
  requireRole(request, 'admin');

/**
 * Rejects any caller that does not hold the business role.
 *
 * Nothing calls this yet, and it exists because nothing *could*: until now the
 * only guard was `requireAdmin`, so a callable acting for a restaurant had no
 * way to check that its caller was one. `'business'` appeared in this project
 * only in the role list and in deny tests. Its first caller is the staff
 * management callable in issue #1537, which needs a business caller and must
 * not be reachable by every signed-in account.
 *
 * **`requireAdmin` is not a superset of this, and must not become one.** The
 * two roles are not a hierarchy (issue #1164, settled by `RD-UR-6` on the
 * `User Roles` SSOT page): an operator reaches a restaurant through its own
 * admin-app surfaces and the `admin` clause in `firestore.rules`, never by
 * being admitted where a restaurant owner is expected. A callable that accepts
 * either role is a callable that cannot say which one acted.
 */
export const requireBusiness = (request: CallableRequest<unknown>): string =>
  requireRole(request, 'business');
