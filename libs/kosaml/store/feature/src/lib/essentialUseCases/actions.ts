import { createAction, props } from '@ngrx/store';

export const selectEssentialUseScenario = createAction(
  '[View EssentialUseCase Page] Select EssentialUseCase',
  props<{ id: string }>()
);
