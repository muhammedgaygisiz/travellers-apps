import { stringIncludesDelimiter } from '../string-includes-delimiter';
import { DELIMITERS } from '../../model/delimiters';

describe('stringIncludesDelimiter', () => {
  it('should return false for null', () => {
    expect(stringIncludesDelimiter(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(stringIncludesDelimiter(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(stringIncludesDelimiter('')).toBe(false);
  });

  it('should return true for string containing a delimiter', () => {
    DELIMITERS.forEach((delimiter) => {
      expect(stringIncludesDelimiter(`test${delimiter}`)).toBe(true);
    });
  });

  it('should return false for string without delimiters', () => {
    expect(stringIncludesDelimiter('testexample')).toBe(false);
  });
});
