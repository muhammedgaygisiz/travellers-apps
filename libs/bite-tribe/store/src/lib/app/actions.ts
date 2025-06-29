import { createAction, props } from '@ngrx/store';
import { Settings } from 'model';

export const fetchGpsPosition = createAction('[APP] Fetch GPS position');

export const loadedGpsPosition = createAction(
  '[APP] Loaded GPS position',
  props<{ position: any }>()
);

export const errorLoadingGpsPosition = createAction(
  '[APP] Error loading GPS position',
  props<{ error: any }>()
);

export const saveSettings = createAction(
  '[APP] Save settings',
  props<{ settings: Settings }>()
);

export const loadedSettingsFromApi = createAction(
  '[APP] Loaded settings from API',
  props<{ settings: Settings }>()
);

export const setIsPublicProfile = createAction(
  '[APP] Set is public profile',
  props<{ isPublic: boolean }>()
);

export const goPublic = createAction('[APP] Go public');
export const goPrivate = createAction('[APP] Go private');
