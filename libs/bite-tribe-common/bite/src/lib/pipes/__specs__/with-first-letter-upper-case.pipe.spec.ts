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
});
