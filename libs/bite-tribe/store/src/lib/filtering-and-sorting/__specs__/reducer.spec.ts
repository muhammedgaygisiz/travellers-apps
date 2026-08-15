import { reducer } from '../reducer';
import { FilteringAndSortingActions } from '../actions';
import { FilteringAndSortingSlice } from '../filtering-and-sorting-slice.model';

describe('Filtering And Sorting Reducer', () => {
  describe('setHomeFilters', () => {
    it('should set home filters', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {};

      const NEW_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: ['#food', '#drink'],
            distance: 0,
            maxPrice: 0,
          },
        },
      };

      const setHomeFiltersAction = FilteringAndSortingActions.setHomeFilters({
        filters: {
          tagFilters: ['#food', '#drink'],
          distanceFilter: '',
          priceFilter: 0,
        },
      });

      expect(reducer(INITIAL_STATE, setHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should override existing home filters', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: ['#old', '#filters'],
            distance: 10,
            maxPrice: 50,
          },
        },
      };

      const NEW_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: ['#new', '#filters'],
            distance: 0,
            maxPrice: 0,
          },
        },
      };

      const setHomeFiltersAction = FilteringAndSortingActions.setHomeFilters({
        filters: {
          tagFilters: ['#new', '#filters'],
          distanceFilter: '',
          priceFilter: 0,
        },
      });

      expect(reducer(INITIAL_STATE, setHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('clearHomeFilters', () => {
    it('should clear all home filters', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: ['#food', '#drink', '#coffee'],
            distance: 20,
            maxPrice: 100,
          },
        },
      };

      const NEW_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: [],
            distance: undefined,
            maxPrice: 0,
          },
        },
      };

      const clearHomeFiltersAction =
        FilteringAndSortingActions.clearHomeFilters();

      expect(reducer(INITIAL_STATE, clearHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should handle clearing already empty filters', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: [],
            distance: undefined,
            maxPrice: 0,
          },
        },
      };

      const NEW_STATE: FilteringAndSortingSlice = {
        filtering: {
          home: {
            filters: [],
            distance: undefined,
            maxPrice: 0,
          },
        },
      };

      const clearHomeFiltersAction =
        FilteringAndSortingActions.clearHomeFilters();

      expect(reducer(INITIAL_STATE, clearHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setHomeSorting', () => {
    it('should set home sorting', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        sorting: { home: 'distance' },
      };
      const NEW_STATE: FilteringAndSortingSlice = {
        sorting: { home: 'price' },
      };

      const setHomeSortingAction = FilteringAndSortingActions.setHomeSorting({
        sorting: 'price',
      });

      expect(reducer(INITIAL_STATE, setHomeSortingAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setMyBitesSorting', () => {
    it('should set my bites sorting', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        sorting: { myBites: 'distance' },
      };
      const NEW_STATE: FilteringAndSortingSlice = {
        sorting: { myBites: 'likes' },
      };

      const setMyBitesSortingAction =
        FilteringAndSortingActions.setMyBitesSorting({
          sorting: 'likes',
        });

      expect(reducer(INITIAL_STATE, setMyBitesSortingAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setRestaurantBitesSorting', () => {
    it('should set restaurant bites sorting', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        sorting: { restaurantBites: 'createdAt' },
      };
      const NEW_STATE: FilteringAndSortingSlice = {
        sorting: { restaurantBites: 'likes' },
      };

      const setRestaurantBitesSortingAction =
        FilteringAndSortingActions.setRestaurantBitesSorting({
          sorting: 'likes',
        });

      expect(reducer(INITIAL_STATE, setRestaurantBitesSortingAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedFromPreferences', () => {
    it('should replace the state with the incoming slice', () => {
      const INITIAL_STATE: FilteringAndSortingSlice = {
        sorting: { home: 'distance' },
      };

      const NEW_SLICE: FilteringAndSortingSlice = {
        sorting: { bucketlists: 'likes' },
        filtering: { home: { filters: ['#test'] } },
      };

      const loadedFromPreferencesAction =
        FilteringAndSortingActions.loadedFromPreferences({
          slice: NEW_SLICE,
        });

      expect(reducer(INITIAL_STATE, loadedFromPreferencesAction)).toEqual(
        NEW_SLICE,
      );
    });
  });
});
