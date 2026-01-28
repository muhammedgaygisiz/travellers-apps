import * as fromRouter from '@ngrx/router-store';
import { createSelector } from '@ngrx/store';

const { selectRouteParams } = fromRouter.getRouterSelectors();

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
