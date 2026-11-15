import { newCountryCode } from '../new-country-codes';

describe('newCountryCode', () => {
  it('answers the code an update adds', () => {
    expect(newCountryCode(['DE'], ['DE', 'JP'])).toBe('JP');
  });

  it('answers nothing when the previous codes were empty', () => {
    expect(newCountryCode([], ['DE'])).toBeUndefined();
    expect(newCountryCode(undefined, ['DE'])).toBeUndefined();
    expect(newCountryCode(null, ['DE'])).toBeUndefined();
  });

  it('answers once for an update that adds two codes', () => {
    expect(newCountryCode(['DE'], ['DE', 'JP', 'TH'])).toBe('JP');
  });

  it('answers nothing for an update that removes a code', () => {
    expect(newCountryCode(['DE', 'JP'], ['DE'])).toBeUndefined();
  });

  it('answers nothing when the codes are unchanged', () => {
    expect(newCountryCode(['DE', 'JP'], ['JP', 'DE'])).toBeUndefined();
  });

  it('reads the codes the way the profile flags do', () => {
    expect(newCountryCode([' de '], ['DE', 'de', ' ', 'jp'])).toBe('JP');
    expect(newCountryCode(['', ' '], ['DE'])).toBeUndefined();
  });
});
