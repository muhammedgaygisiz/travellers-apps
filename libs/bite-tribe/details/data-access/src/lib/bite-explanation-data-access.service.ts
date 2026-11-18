import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

/** The three parts of a dish explanation, in the requested language. */
export interface BiteExplanation {
  whatItIs: string;
  origin: string;
  ingredients: string[];
}

/**
 * What `explainBite` answers (issue #2106). `cached` says whether the
 * explanation was already kept; the app reads it only for analytics.
 */
export type BiteExplanationResult =
  | { status: 'ok'; cached: boolean; explanation: BiteExplanation }
  | { status: 'unknown'; cached: boolean }
  | { status: 'limit' }
  | { status: 'unavailable' };

interface ExplainBiteRequest {
  biteId: string;
  language: string;
}

/**
 * Asks the backend to explain a Bite's dish (issue #2106).
 *
 * Straight to the callable: the explanation is kept server-side, in a
 * collection no client may read, so there is nothing for the store to hold.
 * Any failure - offline, App Check, the function itself - is answered as
 * `unavailable`, which the modal offers to retry.
 */
@Injectable({ providedIn: 'root' })
export class BiteExplanationDataAccessService {
  async explainBite(
    biteId: string,
    language: string,
  ): Promise<BiteExplanationResult> {
    try {
      const result = await FirebaseFunctions.callByName<
        ExplainBiteRequest,
        BiteExplanationResult
      >({
        name: 'explainBite',
        data: { biteId, language },
      });

      return result.data ?? { status: 'unavailable' };
    } catch (error) {
      console.warn('explainBite failed:', error);

      return { status: 'unavailable' };
    }
  }
}
