import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import {
  loadedReviewsFromApi,
  saveNewReview,
  saveReviewReply,
} from './actions';
import { concatMap, filter, map, switchMap } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { biteId } from '../router/selectors';
import { PATH } from 'utils';

@Injectable()
export class ReviewEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);

  private readonly biteId = toSignal(this.store.select(biteId));

  loadReviewsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(
        ({ payload }) =>
          payload.event.urlAfterRedirects.includes(`/${PATH.BITE}/`) &&
          !payload.event.urlAfterRedirects.includes(`${PATH.RESTAURANT}`),
      ),
      switchMap(() => {
        const biteId = this.biteId();
        return this.api.reviewsByBiteId(biteId);
      }),
      map((reviews) => loadedReviewsFromApi({ reviews })),
    );
  });

  saveNewReviewToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(saveNewReview),
      switchMap((payload) => {
        return this.api.saveNewReview(payload);
      }),
      map((reviews) => loadedReviewsFromApi({ reviews })),
    );
  });

  /**
   * Posts an answer inside a thread and puts the reloaded compartment back into
   * the store, which is what renders the reply without a page reload.
   *
   * Sequential rather than switched: two replies written in quick succession
   * are two separate writes, and dropping the first reload would hide a reply
   * that has already been persisted.
   */
  saveReviewReplyToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(saveReviewReply),
      concatMap(({ review, biteId, parentReviewId, threadId }) =>
        this.api.saveReviewReply({ review, biteId, parentReviewId, threadId }),
      ),
      map((reviews) => loadedReviewsFromApi({ reviews })),
    );
  });
}
