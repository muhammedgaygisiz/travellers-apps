import { createAction, props } from '@ngrx/store';

export const selectConcreteUseCase = createAction(
  '[View Concrete Use Case Page] Select Concrete Use Case',
  props<{ id: string }>()
);
