import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ProfileMetaData, PublicUser, Settings } from 'model';

export const AppActions = createActionGroup({
  source: 'APP',
  events: {
    'Fetch GPS position': emptyProps(),
    'Reload GPS position': emptyProps(),
    'Clear GPS error': emptyProps(),
    'Loaded GPS position': props<{ position: any }>(),
    'Error loading GPS position': props<{ error: any }>(),
    'Save settings': props<{ settings: Settings }>(),
    'Save public profile': props<{ profile: PublicUser }>(),
    'Saved public profile': props<{ profile: PublicUser }>(),
    'Error saving public profile': emptyProps(),
    'Loaded settings from API': props<{ settings: Settings }>(),
    'Set public profile': props<{ profile: PublicUser }>(),
    'Follow user': props<{ user: PublicUser }>(),
    'Unfollow user': props<{ user: PublicUser }>(),
    'Loaded exchange rates from API': props<{
      exchangeRates: Record<string, number>;
    }>(),
    'Loaded Profile metadata': props<ProfileMetaData>(),
    'Reload Profile metadata': emptyProps(),
    'Start loading followers data': emptyProps(),
    'Stop loading followers data': emptyProps(),
  },
});
