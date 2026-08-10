import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import type { Review } from 'model';
import { toReviewThreads } from './utils/to-review-threads';

const slice = createFeatureSelector<EntityState<Review>>(key);

const { selectAll } = adapter.getSelectors();

export const reviews = createSelector(slice, selectAll);

/**
 * The Bite's reviews as conversations rather than as a flat list. Grouping is
 * a display shape derived from the same documents, so it lives here instead of
 * being recomputed by every page that renders reviews (issue #1283).
 */
export const reviewThreads = createSelector(reviews, toReviewThreads);
