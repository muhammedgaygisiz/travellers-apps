import { inject, Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { ListBiteReportsResult } from 'model';
import {
  BiteSearchDataAccessService,
  DeleteBiteResult,
} from './bite-search-data-access.service';

interface DismissBiteReportsRequest {
  biteId: string;
  reason: string;
}

export interface DismissBiteReportsResult {
  biteId: string;
  dismissedReports: number;
}

interface SetUserBlockedRequest {
  uid: string;
  blocked: boolean;
}

/**
 * The calls behind the admin app's report queue (GitHub issue #1608).
 *
 * The queue offers the three answers an operator has to a report, and two of
 * them already existed: deleting the Bite goes through the same
 * `deleteBiteAsOperator` the Bite lookup uses, and blocking the author through
 * the same `setUserBlocked` user management uses. Only dismissing is new.
 *
 * Blocking is one call repeated rather than reached through the user-management
 * data-access: that library belongs to another feature, and a feature reaching
 * into its neighbour's data-access is the drift `depConstraints` was tightened
 * against in #1317.
 *
 * Errors are not swallowed. An operator told a report was handled when it was
 * not will not look at it again.
 */
@Injectable({ providedIn: 'root' })
export class BiteReportsDataAccessService {
  private readonly biteSearch = inject(BiteSearchDataAccessService);

  /** Every Bite with an open report, most-reported first. */
  async list(): Promise<ListBiteReportsResult> {
    const { data } = await FirebaseFunctions.callByName<
      void,
      ListBiteReportsResult
    >({ name: 'listBiteReports' });

    return data ?? { bites: [], truncated: false };
  }

  /** Closes the open reports on a Bite that stays up. */
  async dismiss(
    biteId: string,
    reason: string,
  ): Promise<DismissBiteReportsResult> {
    const { data } = await FirebaseFunctions.callByName<
      DismissBiteReportsRequest,
      DismissBiteReportsResult
    >({ name: 'dismissBiteReports', data: { biteId, reason: reason.trim() } });

    return data;
  }

  /**
   * Deletes the reported Bite. Its reports go with it, through the trigger on
   * the Bite's deletion, so nothing has to be closed afterwards.
   */
  deleteBite(biteId: string, reason: string): Promise<DeleteBiteResult> {
    return this.biteSearch.deleteBite(biteId, reason);
  }

  /**
   * Blocks the author from signing in. Their Bites stay, this one included,
   * which is why blocking does not close the reports: the Bite is still there
   * to be judged.
   */
  async blockAuthor(uid: string): Promise<void> {
    await FirebaseFunctions.callByName<SetUserBlockedRequest, unknown>({
      name: 'setUserBlocked',
      data: { uid, blocked: true },
    });
  }
}
