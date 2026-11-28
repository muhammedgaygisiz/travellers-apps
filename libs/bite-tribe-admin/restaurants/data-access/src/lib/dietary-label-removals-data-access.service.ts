import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type {
  AnswerDietaryLabelRemovalRequest,
  AnswerDietaryLabelRemovalResult,
  ListDietaryLabelRemovalsResult,
} from 'model';

/**
 * The calls behind the operator's queue of removed dietary labels (GitHub
 * issue #2199): each is restored or its removal confirmed, with a reason the
 * operator log keeps. Errors are not swallowed, as for the report queues.
 */
@Injectable({ providedIn: 'root' })
export class DietaryLabelRemovalsDataAccessService {
  async list(): Promise<ListDietaryLabelRemovalsResult> {
    const { data } = await FirebaseFunctions.callByName<
      void,
      ListDietaryLabelRemovalsResult
    >({ name: 'listDietaryLabelRemovals' });

    return data ?? { removals: [] };
  }

  async answer(
    request: AnswerDietaryLabelRemovalRequest,
  ): Promise<AnswerDietaryLabelRemovalResult> {
    const { data } = await FirebaseFunctions.callByName<
      AnswerDietaryLabelRemovalRequest,
      AnswerDietaryLabelRemovalResult
    >({ name: 'answerDietaryLabelRemoval', data: request });

    return data;
  }
}
