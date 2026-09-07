import { Injectable, resource } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeRole, SubscriptionTier } from 'utils';
import {
  AdminUser,
  ListUsersResult,
  SetUserRolesResult,
  SetUserSubscriptionTierResult,
} from './admin-user.model';

/**
 * The largest page `listUsersWithRoles` will serve, so the loop below asks for
 * the fewest round trips the backend allows rather than the 200 it defaults to.
 */
const PAGE_SIZE = 1000;

/**
 * How many pages the loop will follow before it stops.
 *
 * A bound rather than "until the token runs out", because the loop is driven by
 * a value the backend returns: a token that never stops being handed back turns
 * one page load into an unbounded sequence of calls with nothing on the client
 * to end it. Twenty pages is 20,000 accounts, which is far past anything this
 * project has and far short of anything that hangs a browser.
 */
const MAX_PAGES = 20;

interface ListUsersRequest {
  pageToken?: string;
  limit?: number;
}

interface SetUserRolesRequest {
  uid: string;
  roles: BiteTribeRole[];
}

interface SetUserSubscriptionTierRequest {
  uid: string;
  tier: SubscriptionTier;
  reason: string;
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
   * **Every page, not the first one.** The callable pages at up to 1000 and
   * hands back a token; this client used to send no limit, take the 200 the
   * callable defaults to and drop the token on the floor, so account 201 did
   * not exist as far as the admin app was concerned. That was survivable while
   * the page was only a list to scroll. It stops being survivable once an
   * operator searches it for the one account someone reported, because a search
   * that silently covers a prefix of the accounts answers "no such account" for
   * an account that exists (issue #1476).
   *
   * Sorted by email because the list is read by a person looking for one
   * account. Firebase returns them in uid order, which is arbitrary to anyone
   * who is not Firebase. An account with no email sorts by uid rather than
   * ahead of everything on an empty string.
   */
  async fetchUsers(): Promise<AdminUser[]> {
    const users: AdminUser[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { data } = await FirebaseFunctions.callByName<
        ListUsersRequest,
        ListUsersResult
      >({
        name: 'listUsersWithRoles',
        data: { limit: PAGE_SIZE, ...(pageToken ? { pageToken } : {}) },
      });

      users.push(...(data?.users ?? []));
      pageToken = data?.nextPageToken;

      if (!pageToken) {
        break;
      }
    }

    return users.sort((a, b) =>
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

  /**
   * Sets an account's subscription tier for a support case.
   *
   * A separate callable from `setRoles`, and a separate action in the UI, for
   * the reason the epic keeps blocking separate from content removal: one
   * button with two consequences is harder to reason about and harder to undo.
   *
   * The reason is required by the callable rather than optional, because Cloud
   * Logging is the only record the action leaves (issue #1485).
   */
  async setSubscriptionTier(
    uid: string,
    tier: SubscriptionTier,
    reason: string,
  ): Promise<SetUserSubscriptionTierResult> {
    const { data } = await FirebaseFunctions.callByName<
      SetUserSubscriptionTierRequest,
      SetUserSubscriptionTierResult
    >({ name: 'setUserSubscriptionTier', data: { uid, tier, reason } });

    return data;
  }

  reload(): void {
    this.users.reload();
  }
}
