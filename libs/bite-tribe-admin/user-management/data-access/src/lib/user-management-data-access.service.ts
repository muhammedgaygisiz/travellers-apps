import { Injectable, resource } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeRole } from 'utils';
import {
  AdminUser,
  ListUsersResult,
  SetUserRolesResult,
} from './admin-user.model';

interface ListUsersRequest {
  pageToken?: string;
  limit?: number;
}

interface SetUserRolesRequest {
  uid: string;
  roles: BiteTribeRole[];
}

/**
 * Reads and writes BiteTribe accounts through the admin-only callables.
 *
 * Both go to Firebase Auth rather than to Firestore, because roles are custom
 * claims: there is no document to query for "who is an admin", and the
 * `/users` collection cannot answer it (issue #1469).
 *
 * Neither callable is trusted to be reachable by anyone but an operator — both
 * re-check the caller's own claim server-side. What this service adds is the
 * client's view of the answer.
 */
@Injectable({ providedIn: 'root' })
export class UserManagementDataAccessService {
  /**
   * The account list.
   *
   * A `resource` rather than a one-shot call so the page can reload it after a
   * save without re-implementing the request, and so the loading and error
   * states are the ones the rest of the workspace already renders.
   */
  readonly users = resource<AdminUser[], unknown>({
    loader: () => this.fetchUsers(),
  });

  /**
   * The loader body, as a plain method so it can be tested without driving a
   * `resource` through a reactive context.
   *
   * Sorted by email because the list is read by a person looking for one
   * account. Firebase returns them in uid order, which is arbitrary to anyone
   * who is not Firebase. An account with no email sorts by uid rather than
   * ahead of everything on an empty string.
   */
  async fetchUsers(): Promise<AdminUser[]> {
    const { data } = await FirebaseFunctions.callByName<
      ListUsersRequest,
      ListUsersResult
    >({ name: 'listUsersWithRoles', data: {} });

    return [...(data?.users ?? [])].sort((a, b) =>
      (a.email || a.uid).localeCompare(b.email || b.uid),
    );
  }

  /**
   * Replaces an account's whole role set.
   *
   * The callable replaces rather than merges, so an empty list revokes. That is
   * deliberate: two operators editing the same account cannot end up merging
   * their intents into a union neither of them chose.
   */
  async setRoles(
    uid: string,
    roles: BiteTribeRole[],
  ): Promise<SetUserRolesResult> {
    const { data } = await FirebaseFunctions.callByName<
      SetUserRolesRequest,
      SetUserRolesResult
    >({ name: 'setUserRoles', data: { uid, roles } });

    return data;
  }

  reload(): void {
    this.users.reload();
  }
}
