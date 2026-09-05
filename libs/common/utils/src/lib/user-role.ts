/**
 * The roles BiteTribe grants to an account beyond "is signed in".
 *
 * A role is a Firebase Auth **custom claim**, written only by the backend and
 * carried in the ID token. The client can read it, and a client that lies about
 * it changes nothing: every privileged callable re-reads the claim from the
 * verified token, and the eventual ownership-scoped Firestore rules read it
 * from `request.auth.token`. See GitHub issue #1469 and #1075.
 *
 * `admin` and `business` are deliberately separate rather than a hierarchy. An
 * operator account is not a restaurant, and granting it restaurant maintenance
 * rights by implication would make the business app's "only what you own" gate
 * meaningless for the one set of accounts most able to break it.
 */
export const BITE_TRIBE_ROLES = ['admin', 'business'] as const;

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
