import * as fromSelectors from '../selectors';
import { FilteringAndSortingSlice } from '../filtering-and-sorting-slice.model';

describe('Filtering and Sorting Selectors', () => {
  const mockState: FilteringAndSortingSlice = {
    filtering: {
      home: {
        filters: ['#food', '#drink'],
      },
    },
  };

  describe('homeFilters', () => {
    it('should return the home filters', () => {
      const result = fromSelectors.homeFilters.projector(mockState);
      expect(result).toEqual(['#food', '#drink']);
    });

    it('should return empty array when no filters exist', () => {
      const stateWithoutFilters: FilteringAndSortingSlice = {
        ...mockState,
        filtering: { home: { filters: [] } },
      };
      const result = fromSelectors.homeFilters.projector(stateWithoutFilters);
      expect(result).toEqual([]);
    });
  });

  describe('homeMaxPriceFilter', () => {
    it('should return the max price filter', () => {
      const result = fromSelectors.homeMaxPriceFilter.projector(mockState);
      expect(result).toBe(0);
    });

    it('should return 0 when max price filter is not set', () => {
      const stateWithoutMaxPrice: FilteringAndSortingSlice = {
        ...mockState,
        filtering: {
          home: {
            maxPrice: undefined,
            filters: [],
          },
        },
      };

      const result =
        fromSelectors.homeMaxPriceFilter.projector(stateWithoutMaxPrice);
      expect(result).toBe(0);
    });
  });

  describe('homeDistance', () => {
    it('should return the home distance', () => {
      const result = fromSelectors.homeDistance.projector(mockState);
      expect(result).toBeUndefined();
    });

    it('should return undefined when home distance is not set', () => {
      const stateWithoutDistance = {
        ...mockState,
        filtering: {
          home: {
            maxPrice: undefined,
            filters: [],
            distance: undefined,
          },
        },
      };

      const result = fromSelectors.homeDistance.projector(stateWithoutDistance);
      expect(result).toBeUndefined();
    });
  });

  describe('homeSorting', () => {
    it('should return the home sorting method', () => {
      const stateWithSorting: FilteringAndSortingSlice = {
        ...mockState,
        sorting: { home: 'distance' },
      };
      const result = fromSelectors.homeSorting.projector(stateWithSorting);
      expect(result).toBe('distance');
    });

    it('should return "distance" when home sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, sorting: undefined };
      const result = fromSelectors.homeSorting.projector(stateWithoutSorting);
      expect(result).toBe('distance');
    });

    it('should return distance when slice is undefined', () => {
      const result = fromSelectors.homeSorting.projector(
        undefined as unknown as Parameters<
          typeof fromSelectors.homeSorting.projector
        >[0],
      );
      expect(result).toBe('distance');
    });
  });

  describe('myBitesSorting', () => {
    it('should return the my bites sorting method', () => {
      const stateWithMyBitesSorting: FilteringAndSortingSlice = {
        ...mockState,
        sorting: { myBites: 'likes' },
      };
      const result = fromSelectors.myBitesSorting.projector(
        stateWithMyBitesSorting,
      );
      expect(result).toBe('likes');
    });

    it('should return "distance" when my bites sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, sorting: undefined };
      const result =
        fromSelectors.myBitesSorting.projector(stateWithoutSorting);
      expect(result).toBe('distance');
    });

    it('should return distance when slice is undefined', () => {
      const result = fromSelectors.myBitesSorting.projector(
        undefined as unknown as Parameters<
          typeof fromSelectors.myBitesSorting.projector
        >[0],
      );
      expect(result).toBe('distance');
    });
  });

  describe('restaurantBitesSorting', () => {
    it('should return the restaurant bites sorting method', () => {
      const stateWithRestaurantBitesSorting: FilteringAndSortingSlice = {
        ...mockState,
        sorting: { restaurantBites: 'likes' },
      };
      const result = fromSelectors.restaurantBitesSorting.projector(
        stateWithRestaurantBitesSorting,
      );
      expect(result).toBe('likes');
    });

    it('should return "createdAt" when restaurant bites sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, sorting: undefined };
      const result =
        fromSelectors.restaurantBitesSorting.projector(stateWithoutSorting);
      expect(result).toBe('createdAt');
    });

    it('should return createdAt when slice is undefined', () => {
      const result = fromSelectors.restaurantBitesSorting.projector(
        undefined as unknown as Parameters<
          typeof fromSelectors.restaurantBitesSorting.projector
        >[0],
      );
      expect(result).toBe('createdAt');
    });
  });
});
