import { createAction, props } from '@ngrx/store';

export const saveNewBite = createAction(
  '[BITES] Save new bite',
  props<{ bite: any }>()
);
