import { removeDelimiterFromEndOfString } from '../remove-delimiter-from-end-of-string';

describe('removeDelimiterFromEndOfString', () => {
  it('should remove the delimiter from the string', () => {
    const input = 'cherry,';
    const expectedOutput = 'cherry';
    expect(removeDelimiterFromEndOfString(input)).toBe(expectedOutput);
  });

  it('should return the same string if delimiter is not found', () => {
    const input = 'cherry';
    expect(removeDelimiterFromEndOfString(input)).toBe(input);
  });

  it('should handle empty strings', () => {
    const input = '';
    expect(removeDelimiterFromEndOfString(input)).toBe(input);
  });
});
