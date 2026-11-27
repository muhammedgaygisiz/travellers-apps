import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetDocumentResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { map, type Observable } from 'rxjs';
import {
  dietaryOwnVotesId,
  dietaryScopeOwnVotesOf,
  dietaryScopeTalliesOf,
  type DietaryLabelTallies,
  type DietaryOwnVotes,
  type VoteDietaryLabelRequest,
  type VoteDietaryLabelResult,
} from 'model';
import { snapshotListener } from '../utils/snapshot-listener';

export const DIETARY_LABEL_TALLIES = 'dietaryLabelTallies';
export const DIETARY_LABEL_VOTES = 'dietaryLabelVotes';

/**
 * Diners confirming or disputing a dietary label (GitHub issue #2197).
 *
 * Votes go through `voteDietaryLabel`; the counts and the caller's own votes
 * are read straight from Firestore, where the rules let a member read the
 * counts and an account read only its own votes, and nobody write either.
 */
@Injectable({ providedIn: 'root' })
export class DietaryVoteApiService {
  private readonly errorHandler = inject(ErrorHandler);

  /**
   * Casts or replaces a vote. Errors are not swallowed: a diner told their
   * vote counted when it did not would not cast it again.
   */
  async voteDietaryLabel(
    request: VoteDietaryLabelRequest,
  ): Promise<VoteDietaryLabelResult> {
    const result = await FirebaseFunctions.callByName<
      VoteDietaryLabelRequest,
      VoteDietaryLabelResult
    >({ name: 'voteDietaryLabel', data: request });

    return result.data;
  }

  /**
   * A scope's counts by subject, for as long as somebody is subscribed, so a
   * vote anybody casts reaches every reader (`R-5`). A missing document or a
   * failed listener reads as no counts.
   */
  tallies$(scopeKey: string): Observable<Record<string, DietaryLabelTallies>> {
    return snapshotListener<GetDocumentResult<DocumentData>>(
      (callback) =>
        FirebaseFirestore.addDocumentSnapshotListener(
          { reference: `${DIETARY_LABEL_TALLIES}/${scopeKey}` },
          callback,
        ),
      (error) => this.errorHandler.handleError(error),
    ).pipe(
      map((delivery) => dietaryScopeTalliesOf(delivery.event?.snapshot?.data)),
    );
  }

  /** The caller's own votes in a scope by subject; none when unreadable. */
  async loadOwnVotes(
    scopeKey: string,
    uid: string,
  ): Promise<Record<string, DietaryOwnVotes>> {
    try {
      const { snapshot } = await FirebaseFirestore.getDocument({
        reference: `${DIETARY_LABEL_VOTES}/${dietaryOwnVotesId(scopeKey, uid)}`,
      });

      return dietaryScopeOwnVotesOf(snapshot?.data);
    } catch (error) {
      console.warn('Could not read the own dietary votes:', error);

      return {};
    }
  }
}
