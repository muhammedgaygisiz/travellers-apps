import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { ListUserReportsResult } from 'model';

interface DismissUserReportsRequest {
  uid: string;
  reason: string;
}

export interface DismissUserReportsResult {
  uid: string;
  dismissedReports: number;
}

interface SetUserBlockedRequest {
  uid: string;
  blocked: boolean;
}

/**
 * The calls behind the admin app's queue of reported profiles (GitHub issue
 * #1829).
 *
 * The profile counterpart of `BiteReportsDataAccessService`, and beside it in
 * the same library because it is the same queue for another kind of report.
 * Blocking is the existing account block (#1474), the same `setUserBlocked`
 * user management and the Bite queue call.
 *
 * Errors are not swallowed. An operator told a report was handled when it was
 * not will not look at it again.
 */
@Injectable({ providedIn: 'root' })
export class UserReportsDataAccessService {
  /** Every profile with an open report, most-reported first. */
  async list(): Promise<ListUserReportsResult> {
    const { data } = await FirebaseFunctions.callByName<
      void,
      ListUserReportsResult
    >({ name: 'listUserReports' });

    return data ?? { users: [], truncated: false };
  }

  /** Closes the open reports on a profile. */
  async dismiss(
    uid: string,
    reason: string,
  ): Promise<DismissUserReportsResult> {
    const { data } = await FirebaseFunctions.callByName<
      DismissUserReportsRequest,
      DismissUserReportsResult
    >({ name: 'dismissUserReports', data: { uid, reason: reason.trim() } });

    return data;
  }

  /**
   * Blocks the reported account from signing in. Its reports stay open, so
   * the operator closes them once nothing else is left to do.
   */
  async blockAccount(uid: string): Promise<void> {
    await FirebaseFunctions.callByName<SetUserBlockedRequest, unknown>({
      name: 'setUserBlocked',
      data: { uid, blocked: true },
    });
  }
}
