import { BiteTribeRole } from 'utils';

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
}

export interface ListUsersResult {
  users: AdminUser[];
  nextPageToken?: string;
}

export interface SetUserRolesResult {
  uid: string;
  roles: BiteTribeRole[];
}
