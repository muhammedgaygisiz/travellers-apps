import addLocationFilter from '../add-location-filter';

describe('addLocationFilter', () => {
  describe('given filters', () => {
    describe('and no location', () => {
      it('should return filters with null location filter', () => {
        const filters = [
          {
            type: 'type',
            value: 'value',
          },
        ];
        const result = addLocationFilter(filters, null);

        expect(result).toEqual([...filters, { type: 'location', value: null }]);
      });
    });

    describe('and a location', () => {
      it('should return filters with given location filter', () => {
        const filters = [
          {
            type: 'type',
            value: 'value',
          },
        ];
        const result = addLocationFilter(filters, 'Köln');

        expect(result).toEqual([
          ...filters,
          { type: 'location', value: 'Köln' },
        ]);
      });
    });
  });
});
