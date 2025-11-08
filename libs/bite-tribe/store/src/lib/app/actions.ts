import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { PublicUser, Settings } from 'model';

export const AppActions = createActionGroup({
  source: 'APP',
  events: {
    'Fetch GPS position': emptyProps(),
    'Reload GPS position': emptyProps(),
    'Clear GPS error': emptyProps(),
    'Loaded GPS position': props<{ position: any }>(),
    'Error loading GPS position': props<{ error: any }>(),
    'Save settings': props<{ settings: Settings }>(),
    'Save public profile': props<{ publicUser: PublicUser }>(),
    'Loaded settings from API': props<{ settings: Settings }>(),
    'Set public profile': props<{ profile: PublicUser }>(),
    'Go public': emptyProps(),
    'Go private': emptyProps(),
    'Set home filters': props<{
      filters: {
        tagFilters: string[];
        distanceFilter: string;
        priceFilter: number;
      };
    }>(),
    'Set home sorting': props<{ sorting: string }>(),
    'Clear home filters': emptyProps(),
    'Loaded exchange rates from API': props<{
      exchangeRates: Record<string, number>;
    }>(),
  },
});
