import { FilterIconPipe } from '../filter-icon.pipe';

describe('FilterIconPipe', () => {
  const pipe = new FilterIconPipe();

  describe('given a unknown value', () => {
    const UNKNOWN_VALUE = 'some-value';

    it('should return value', () => {
      const result = pipe.transform(UNKNOWN_VALUE);

      expect(result).toEqual(UNKNOWN_VALUE);
    });
  });

  describe('given location', () => {
    const LOCATION = 'location';

    it('should return location-outline', () => {
      const result = pipe.transform(LOCATION);

      expect(result).toEqual('location-outline');
    });
  });
});
