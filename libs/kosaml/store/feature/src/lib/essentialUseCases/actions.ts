import { createAction, props } from '@ngrx/store';

export const selectEssentialUseCase = createAction(
  '[View EssentialUseCase Page] Select EssentialUseCase',
  props<{ id: string }>()
);
