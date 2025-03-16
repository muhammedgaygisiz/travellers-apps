import getFilteredPrices from '../get-filtered-prices';
import { MostSearchedItem } from '../../api/most-searched-item.model';
import Filter from '../../api/filter';

describe('getFilteredPrices', () => {
  describe('given no items', () => {
    describe('and no filters', () => {
      it('should return empty array', () => {
        const result = getFilteredPrices([], []);

        expect(result).toEqual([]);
      });
    });
  });

  describe('given empty item', () => {
    const ITEMS = [{}] as MostSearchedItem[];

    describe('and no filters', () => {
      it('should return empty array', () => {
        const result = getFilteredPrices(ITEMS, []);

        expect(result).toEqual([]);
      });
    });

    describe('and a location filter', () => {
      const FILTERS = [{ type: 'location', value: 'Köln' }] as Filter[];

      it('should empty array', () => {
        const result = getFilteredPrices(ITEMS, FILTERS);

        expect(result).toEqual([]);
      });
    });
  });

  describe('given item', () => {
    const ITEMS = [{ location: 'Köln' }] as MostSearchedItem[];

    describe('and a matching location filter', () => {
      const FILTERS = [{ type: 'location', value: 'Köln' }] as Filter[];

      it('should return filtered items', () => {
        const result = getFilteredPrices(ITEMS, FILTERS);

        expect(result).toEqual(ITEMS);
      });
    });

    describe('and a not matching filter type', () => {
      const FILTERS = [{ type: 'price', value: '7' }] as Filter[];

      it('should return filtered items', () => {
        const result = getFilteredPrices(ITEMS, FILTERS);

        expect(result).toEqual([]);
      });
    });
  });
});
