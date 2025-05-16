import * as fromRouter from '@ngrx/router-store';
import { createSelector } from '@ngrx/store';

const { selectRouteParams } = fromRouter.getRouterSelectors();

export const biteId = createSelector(
  selectRouteParams,
  (params) => params?.['biteId']
);

export const restaurantId = createSelector(
  selectRouteParams,
  (params) => params?.['restaurantId']
);

export const menuId = createSelector(
  selectRouteParams,
  (params) => params?.['menuId']
);
