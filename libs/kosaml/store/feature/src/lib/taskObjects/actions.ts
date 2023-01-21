import { createAction, props } from '@ngrx/store';

export const selectTaskObject = createAction(
  '[View Task Object Page] Select Task Object',
  props<{ id: string }>()
);
