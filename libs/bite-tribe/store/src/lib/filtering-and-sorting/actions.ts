import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { FilteringAndSortingSlice } from './filtering-and-sorting-slice.model';

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
    'Loaded from preferences': props<{ slice: FilteringAndSortingSlice }>(),
  },
});
