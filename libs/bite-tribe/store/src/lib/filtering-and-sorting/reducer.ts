import { createReducer, on } from '@ngrx/store';
import { FilteringAndSortingSlice } from './filtering-and-sorting-slice.model';
import { FilteringAndSortingActions } from './actions';

const initialState: FilteringAndSortingSlice = {
  sorting: {
    home: 'distance',
    myBites: 'distance',
    restaurantBites: 'createdAt',
    bucketlists: 'distance',
  },
  filtering: {
    home: {
      filters: [],
      distance: undefined,
      maxPrice: 0,
    },
  },
};

export const reducer = createReducer(
  initialState,
  on(FilteringAndSortingActions.setHomeFilters, (state, { filters }) => ({
    ...state,
    filtering: {
      ...state.filtering,
      home: {
        filters: filters.tagFilters,
        distance: +filters.distanceFilter,
        maxPrice: filters.priceFilter,
      },
    },
  })),
  on(FilteringAndSortingActions.clearHomeFilters, (state) => ({
    ...state,
    filtering: {
      ...state.filtering,
      home: {
        filters: [],
        distance: undefined,
        maxPrice: 0,
      },
    },
  })),
  on(FilteringAndSortingActions.setHomeSorting, (state, { sorting }) => ({
    ...state,
    sorting: {
      ...state.sorting,
      home: sorting,
    },
  })),
  on(FilteringAndSortingActions.setMyBitesSorting, (state, { sorting }) => ({
    ...state,
    sorting: {
      ...state.sorting,
      myBites: sorting,
    },
  })),
  on(FilteringAndSortingActions.setBucketlistSorting, (state, { sorting }) => ({
    ...state,
    sorting: {
      ...state.sorting,
      bucketlists: sorting,
    },
  })),
  on(FilteringAndSortingActions.loadedFromPreferences, (state, { slice }) => ({
    ...slice,
  })),
);
