import { createAction, props } from '@ngrx/store';

export const networkStatusChanged = createAction(
  '[Network Status] Changed',
  props<{ isOnline: boolean }>()
);
