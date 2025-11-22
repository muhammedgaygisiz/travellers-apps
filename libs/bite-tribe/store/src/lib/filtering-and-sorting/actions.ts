import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const FilteringAndSortingActions = createActionGroup({
  source: 'Filtering and Sorting',
  events: {
    'Set home filters': props<{
      filters: {
        tagFilters: string[];
        distanceFilter: string;
        priceFilter: number;
      };
    }>(),
    'Set home sorting': props<{ sorting: string }>(),
    'Set bucketlist sorting': props<{ sorting: string }>(),
    'Set my bites sorting': props<{ sorting: string }>(),
    'Clear home filters': emptyProps(),
  },
});
