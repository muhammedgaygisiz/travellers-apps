import { normalize } from '../normalize';

describe('normalize', () => {
  it('should normalize a string by trimming, converting to lowercase, and removing diacritics', () => {
    const input = '  Héllo Wörld!  ';
    const expectedOutput = 'hello world!';
    expect(normalize(input)).toBe(expectedOutput);
  });

  it('should handle empty strings', () => {
    expect(normalize('')).toBe('');
  });

  it('should handle strings without diacritics', () => {
    const input = 'Hello World!';
    expect(normalize(input)).toBe('hello world!');
  });

  it('should handle strings with multiple spaces', () => {
    const input = '  Hello   World!  ';
    expect(normalize(input)).toBe('hello world!');
  });

  it('should handle strings with special characters', () => {
    const input = 'Héllo, Wörld! @2023';
    const expectedOutput = 'hello world! @2023';
    expect(normalize(input)).toBe(expectedOutput);
  });
});
