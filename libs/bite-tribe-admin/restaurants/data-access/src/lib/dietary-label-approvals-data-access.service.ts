import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type {
  AnswerDietaryLabelApprovalRequest,
  AnswerDietaryLabelApprovalResult,
  ListDietaryLabelApprovalsResult,
} from 'model';

/**
 * The calls behind the operator's queue of dietary labels waiting for
 * approval (GitHub issue #2198): a restaurant at the strike limit publishes
 * no new label until an operator approves it (`R-8`).
 *
 * Errors are not swallowed, as for the report queues: an operator told a
 * label was answered when it was not will not look at it again.
 */
@Injectable({ providedIn: 'root' })
export class DietaryLabelApprovalsDataAccessService {
  async list(): Promise<ListDietaryLabelApprovalsResult> {
    const { data } = await FirebaseFunctions.callByName<
      void,
      ListDietaryLabelApprovalsResult
    >({ name: 'listDietaryLabelApprovals' });

    return data ?? { approvals: [] };
  }

  async answer(
    request: AnswerDietaryLabelApprovalRequest,
  ): Promise<AnswerDietaryLabelApprovalResult> {
    const { data } = await FirebaseFunctions.callByName<
      AnswerDietaryLabelApprovalRequest,
      AnswerDietaryLabelApprovalResult
    >({ name: 'answerDietaryLabelApproval', data: request });

    return data;
  }
}
