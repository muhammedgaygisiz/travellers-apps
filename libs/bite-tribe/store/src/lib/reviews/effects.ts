import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { loadedReviewsFromApi } from './actions';
import { filter, map, switchMap } from 'rxjs';
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

  // Writing a review or a reply is not an effect: the details page awaits the
  // `saveReview` callable so it can tell the user when the text is refused
  // (issue #1610), and puts the reloaded reviews in with
  // `notifyLoadedReviews`, as an edit does.
}
