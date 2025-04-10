import { createRouterSelector, getRouterSelectors } from '@ngrx/router-store';
import { createSelector } from '@ngrx/store';

const routerSlice = createRouterSelector();

export const { selectRouteParams } = getRouterSelectors(routerSlice);

export const ibanFromParams = createSelector(
  selectRouteParams,
  (params) => params?.['iban']
);
