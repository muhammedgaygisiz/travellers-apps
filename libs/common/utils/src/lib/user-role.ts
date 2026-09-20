/**
 * The roles BiteTribe grants to an account beyond "is signed in".
 *
 * A role is a Firebase Auth **custom claim**, written only by the backend and
 * carried in the ID token. The client can read it, and a client that lies about
 * it changes nothing: every privileged callable re-reads the claim from the
 * verified token, and the ownership-scoped Firestore rules read it from
 * `request.auth.token`. See GitHub issue #1469 and #1075.
 *
 * The three are deliberately separate rather than a hierarchy.
 *
 * An operator account is not a restaurant, and granting it restaurant
 * maintenance rights by implication would make the business app's "only what
 * you own" gate meaningless for the one set of accounts most able to break it.
 *
 * **That question is settled rather than open** (issue #1164, decided by
 * `RD-UR-6` on the `User Roles` SSOT page). The Operator is above the
 * Restaurant Owner in *capability* and not in *claims*: it maintains every
 * restaurant through the admin app and an `admin` clause named in
 * `firestore.rules`, never by holding `business`, and it is admitted to the
 * business app nowhere. Anything that changes it has to change four places
 * together - the claim checks in the callables, the sign-in gate, the route
 * guards, and the rules.
 *
 * `staff` is the narrowed business permission set, and a staff account holds
 * `staff` **instead of** `business` rather than in addition to it. That is why
 * `roleGuard` takes a set of roles: the business app's routes admit both, and a
 * guard on `business` alone would sign a staff account out at the door. The two
 * are mutually exclusive on one account — one operates a restaurant, the other
 * is the narrowed set — and `setUserRoles` refuses the pair.
 *
 * `staff` still grants nothing at the data layer, and issue #1078 left it that
 * way on purpose. The rules scope a write by `Restaurant.ownerUserId`, and
 * there is no equivalent record of which restaurant a staff account works at:
 * writing it is issue #1537. A rule admitting `staff` before that record exists
 * could only admit every staff account to every restaurant, which is the shape
 * of hole #1078 closed. The role opens the business app and reads; reading it
 * as a working write permission is the mistake to avoid until #1537 lands.
 */

/**
 * The role a table guest holds (GitHub issue #1629).
 *
 * Decided on 20 September 2026: the anonymous session a scanned table code
 * mints **is** a role, and `RD-UR-1`'s test - a role is grantable and
 * revocable - is narrowed rather than kept. What grants this one is the scan:
 * `startTableSession` writes the claim on the anonymous account it just
 * admitted, and nothing else ever writes it. `setUserRoles` refuses it
 * outright, which is why {@link GRANTABLE_ROLES} exists beside the list below:
 * an operator picking roles in the admin app is picking from the three that an
 * operator can actually give.
 *
 * It grants nothing. Every gate in the product reads what a caller *is not*:
 * `requireMember` refuses an anonymous sign-in provider and `isMember()` in
 * `firestore.rules` does the same, both independently of this claim
 * (`RD-TS-40`). What the claim buys is that a table guest is nameable - in the
 * admin and business session views, in a token somebody is reading, and in the
 * use case's `Actors`, which admits roles and now has one to admit.
 */
export const BITE_TRIBE_ROLES = [
  'admin',
  'business',
  'staff',
  'tableGuest',
] as const;

export type BiteTribeRole = (typeof BITE_TRIBE_ROLES)[number];

/**
 * The roles an operator may grant, which is every role but the table guest's.
 *
 * `setUserRoles` refuses `tableGuest` and the admin app's picker never offers
 * it: a claim written by a scan is not one a person hands out, and a checkbox
 * for it would be a way to make an account that reads as a guest at no table.
 */
export const GRANTABLE_ROLES = BITE_TRIBE_ROLES.filter(
  (role) => role !== 'tableGuest',
);

/**
 * The custom-claim key the roles are stored under.
 *
 * Firebase reserves a fixed set of claim names and caps the whole custom-claim
 * payload at 1000 bytes, so the roles live in one array under one key rather
 * than as a boolean per role.
 */
export const ROLES_CLAIM = 'roles';

export const isBiteTribeRole = (value: unknown): value is BiteTribeRole =>
  typeof value === 'string' &&
  (BITE_TRIBE_ROLES as readonly string[]).includes(value);

/**
 * Reads the roles out of a decoded ID token payload.
 *
 * The payload is `Record<string, unknown>` on every platform, and an account
 * that has never been granted a role carries no `roles` key at all, so the
 * absent, the malformed and the unknown-value cases all have to resolve to "no
 * roles" rather than to a crash on a login page.
 */
export const rolesFromClaims = (
  claims: Record<string, unknown> | undefined | null,
): BiteTribeRole[] => {
  const raw = claims?.[ROLES_CLAIM];

  return Array.isArray(raw) ? raw.filter(isBiteTribeRole) : [];
};
