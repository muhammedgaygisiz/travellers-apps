import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { ListReviewReportsResult } from 'model';

interface DismissReviewReportsRequest {
  reviewId: string;
  reason: string;
}

export interface DismissReviewReportsResult {
  reviewId: string;
  dismissedReports: number;
}

export interface HideReviewAsOperatorResult {
  reviewId: string;
  dismissedReports: number;
}

interface SetUserBlockedRequest {
  uid: string;
  blocked: boolean;
}

/**
 * The calls behind the admin app's queue of reported reviews and replies
 * (GitHub issue #2117), beside the Bite and profile queues it mirrors.
 * Blocking the author is the existing account block (#1474).
 *
 * Errors are not swallowed. An operator told a report was handled when it was
 * not will not look at it again.
 */
@Injectable({ providedIn: 'root' })
export class ReviewReportsDataAccessService {
  /** Every review with an open report, most recently reported first. */
  async list(): Promise<ListReviewReportsResult> {
    const { data } = await FirebaseFunctions.callByName<
      void,
      ListReviewReportsResult
    >({ name: 'listReviewReports' });

    return data ?? { reviews: [], truncated: false };
  }

  /** Closes the open reports on a review and keeps it up. */
  async dismiss(
    reviewId: string,
    reason: string,
  ): Promise<DismissReviewReportsResult> {
    const { data } = await FirebaseFunctions.callByName<
      DismissReviewReportsRequest,
      DismissReviewReportsResult
    >({
      name: 'dismissReviewReports',
      data: { reviewId, reason: reason.trim() },
    });

    return data;
  }

  /**
   * Hides the review or reply from its thread and closes its open reports
   * (issue #2118). Its text is kept where only operators and its author can
   * read it, and the replies under it stay.
   */
  async hide(
    reviewId: string,
    reason: string,
  ): Promise<HideReviewAsOperatorResult> {
    const { data } = await FirebaseFunctions.callByName<
      DismissReviewReportsRequest,
      HideReviewAsOperatorResult
    >({
      name: 'hideReviewAsOperator',
      data: { reviewId, reason: reason.trim() },
    });

    return data;
  }

  /**
   * Blocks the review's author from signing in. The review and its reports
   * stay, so the operator closes them once nothing else is left to do.
   */
  async blockAuthor(uid: string): Promise<void> {
    await FirebaseFunctions.callByName<SetUserBlockedRequest, unknown>({
      name: 'setUserBlocked',
      data: { uid, blocked: true },
    });
  }
}
