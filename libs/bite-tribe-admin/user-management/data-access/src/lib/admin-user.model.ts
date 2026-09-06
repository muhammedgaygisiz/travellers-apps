import { BiteTribeRole, SubscriptionTier } from 'utils';

/**
 * One BiteTribe account as the admin app sees it.
 *
 * Mirrors `AdminUserSummary` in
 * `apps/bite-tribe-firebase/functions/src/functions/users/list-users-with-roles.ts`.
 * The Functions project compiles with no workspace path mappings, so it cannot
 * import this type and the two are kept in step by hand.
 */
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  roles: BiteTribeRole[];
  disabled: boolean;
  emailVerified: boolean;
  providerIds: string[];
  createdAt: string;
  lastSignInAt: string;
  /**
   * Free, Pro, or `null` for an account nobody has decided about — one with no
   * `/users` document, or one whose document predates the tier being written.
   * `null` is not Free: it is the absence of an answer (issue #1485).
   */
  subscriptionTier: SubscriptionTier | null;
}

export interface ListUsersResult {
  users: AdminUser[];
  nextPageToken?: string;
}

export interface SetUserRolesResult {
  uid: string;
  roles: BiteTribeRole[];
}

export interface SetUserSubscriptionTierResult {
  uid: string;
  tier: SubscriptionTier;
  previousTier: SubscriptionTier | null;
}
