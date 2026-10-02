import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import type { Review } from 'model';
import { toReviewThreads } from './utils/to-review-threads';
import { blockedUserIds } from '../app/selectors';

const slice = createFeatureSelector<EntityState<Review>>(key);

const { selectAll } = adapter.getSelectors();

/**
 * The Bite's reviews, without those written by an account the user blocked
 * (GitHub issue #1609). A reply somebody else wrote to a blocked account's
 * review stays: it then renders as its own root, the way any reply whose root
 * is missing does.
 */
export const reviews = createSelector(
  slice,
  blockedUserIds,
  (state, blockedUserIds) => {
    const blocked = new Set(blockedUserIds);

    return selectAll(state).filter(
      (review) => !review.authorId || !blocked.has(review.authorId),
    );
  },
);

/**
 * The Bite's reviews as conversations rather than as a flat list. Grouping is
 * a display shape derived from the same documents, so it lives here instead of
 * being recomputed by every page that renders reviews (issue #1283).
 */
export const reviewThreads = createSelector(reviews, toReviewThreads);
