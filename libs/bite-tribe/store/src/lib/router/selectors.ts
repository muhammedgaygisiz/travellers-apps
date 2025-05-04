import * as fromRouter from '@ngrx/router-store';
import { createRouterSelector } from '@ngrx/router-store';

export const routerSlice = createRouterSelector();

export const { selectRouteParams } = fromRouter.getRouterSelectors();
