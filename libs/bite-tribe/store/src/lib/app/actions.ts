import { createAction, props } from '@ngrx/store';
import { Settings } from 'model';

export const loadedGpsPosition = createAction(
  '[APP] Loaded GPS position',
  props<{ position: any }>()
);

export const saveSettings = createAction(
  '[APP] Save settings',
  props<{ settings: Settings }>()
);
