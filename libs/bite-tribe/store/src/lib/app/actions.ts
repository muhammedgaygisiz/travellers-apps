import { createAction, props } from '@ngrx/store';
import { PublicUser, Settings } from 'model';

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

export const savePublicProfile = createAction(
  '[APP] Save public profile',
  props<{ publicUser: PublicUser }>()
);

export const loadedSettingsFromApi = createAction(
  '[APP] Loaded settings from API',
  props<{ settings: Settings }>()
);

export const setPublicProfile = createAction(
  '[APP] Set public profile',
  props<{ profile: PublicUser }>()
);

export const goPublic = createAction('[APP] Go public');
export const goPrivate = createAction('[APP] Go private');

export const setHomeFilters = createAction(
  '[APP] Set home filters',
  props<{ filters: string[] }>()
);

export const clearHomeFilters = createAction('[APP] Clear home filters');

export const setHomeNearbyFilter = createAction(
  '[APP] Set home nearby filter',
  props<{ distance: number }>()
);

export const clearHomeNearbyFilter = createAction(
  '[APP] Clear home nearby filter'
);
