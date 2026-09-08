/**
 * The roles BiteTribe grants to an account beyond "is signed in".
 *
 * A role is a Firebase Auth **custom claim**, written only by the backend and
 * carried in the ID token. The client can read it, and a client that lies about
 * it changes nothing: every privileged callable re-reads the claim from the
 * verified token, and the eventual ownership-scoped Firestore rules read it
 * from `request.auth.token`. See GitHub issue #1469 and #1075.
 *
 * The three are deliberately separate rather than a hierarchy.
 *
 * An operator account is not a restaurant, and granting it restaurant
 * maintenance rights by implication would make the business app's "only what
 * you own" gate meaningless for the one set of accounts most able to break it.
 *
 * `staff` is the narrowed business permission set, and a staff account holds
 * `staff` **instead of** `business` rather than in addition to it. That is why
 * `roleGuard` takes a set of roles: the business app's routes admit both, and a
 * guard on `business` alone would sign a staff account out at the door. The two
 * are mutually exclusive on one account — one operates a restaurant, the other
 * is the narrowed set — and `setUserRoles` refuses the pair.
 *
 * `staff` grants nothing yet. It is assertable and grantable ahead of the rules
 * that give it meaning, so a restaurant's staff can be recorded before issue
 * #1078 and #1079 land. Reading it as a working permission is the mistake to
 * avoid until then.
 */
export const BITE_TRIBE_ROLES = ['admin', 'business', 'staff'] as const;

export type BiteTribeRole = (typeof BITE_TRIBE_ROLES)[number];

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
