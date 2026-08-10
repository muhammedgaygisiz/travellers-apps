import * as fromRouter from '@ngrx/router-store';
import { createSelector } from '@ngrx/store';

const { selectRouteParams, selectQueryParams } =
  fromRouter.getRouterSelectors();

export const biteId = createSelector(
  selectRouteParams,
  (params) => params?.['biteId'],
);

export const restaurantId = createSelector(
  selectRouteParams,
  (params) => params?.['restaurantId'],
);

export const menuId = createSelector(
  selectRouteParams,
  (params) => params?.['menuId'],
);

export const bucketlistId = createSelector(
  selectRouteParams,
  (params) => params?.['bucketlistId'],
);

export const userId = createSelector(
  selectRouteParams,
  (params) => params?.['userId'],
);

export const followType = createSelector(
  selectRouteParams,
  (params) => params?.['type'],
);

export const biteTrailId = createSelector(
  selectRouteParams,
  (params) => params?.['biteTrailId'],
);

export const organisationId = createSelector(
  selectRouteParams,
  (params) => params?.['organisationId'],
);

/**
 * The review thread a reply notification points at. Absent on every other way
 * of reaching a Bite, which renders the review compartment as usual
 * (issue #1283).
 */
export const highlightedThreadId = createSelector(
  selectQueryParams,
  (params) => params?.['threadId'],
);

/**
 * The week a weekly bites deep link points at, as delivered by the summary
 * notification. Both bounds are required: a half-filled range says nothing
 * about which week to show, so consumers fall back to their own default.
 */
export const weekRange = createSelector(selectQueryParams, (params) => {
  const weekStart = Number(params?.['weekStart']);
  const weekEnd = Number(params?.['weekEnd']);

  if (!Number.isFinite(weekStart) || !Number.isFinite(weekEnd)) {
    return undefined;
  }

  return { weekStart, weekEnd };
});
