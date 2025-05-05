import * as fromRouter from '@ngrx/router-store';
import { createSelector } from '@ngrx/store';

const { selectRouteParams } = fromRouter.getRouterSelectors();

export const biteId = createSelector(selectRouteParams, (params) => {
  return params?.['id'];
});
