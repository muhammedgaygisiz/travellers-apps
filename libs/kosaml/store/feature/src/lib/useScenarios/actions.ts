import { createAction, props } from '@ngrx/store';

export const selectUseScenario = createAction(
  '[View UseScenario Page] Select UseScenario',
  props<{ id: string }>()
);
