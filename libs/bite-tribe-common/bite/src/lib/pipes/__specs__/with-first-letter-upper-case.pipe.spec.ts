import { WithFirstLetterUpperCasePipe } from '../with-first-letter-upper-case.pipe';

describe(WithFirstLetterUpperCasePipe.name, () => {
  const pipe = new WithFirstLetterUpperCasePipe();

  describe('given no value', () => {
    it('should return empty string', () => {
      expect(pipe.transform(null)).toBe('');
      expect(pipe.transform(undefined)).toBe('');
    });
  });

  describe('given no letter upper case', () => {
    it('should return string with first letter upper case', () => {
      expect(pipe.transform('bite')).toBe('Bite');
    });
  });

  describe('given first letter upper case', () => {
    it('should return the same string', () => {
      expect(pipe.transform('Bite')).toBe('Bite');
    });
  });

  describe('given a Turkish active language', () => {
    it('should uppercase a leading i to the dotted İ', () => {
      expect(pipe.transform('istanbul kebap', 'tr')).toBe('İstanbul kebap');
    });

    it('should leave the rest of the value untouched', () => {
      expect(pipe.transform('izmir simidi', 'tr')).toBe('İzmir simidi');
    });
  });

  describe('given a non-Turkish active language', () => {
    it('should uppercase a leading i to the dotless I', () => {
      expect(pipe.transform('istanbul kebap', 'en')).toBe('Istanbul kebap');
    });
  });
});
