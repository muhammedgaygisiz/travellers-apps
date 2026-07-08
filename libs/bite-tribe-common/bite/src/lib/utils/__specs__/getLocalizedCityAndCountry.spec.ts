import { Bite } from 'model';
import { getLocalizedRegionName } from '../getLocalizedCityAndCountry';

describe('getLocalizedRegionName', () => {
  it('should return city and localized country name when both are set', () => {
    const bite = { city: 'Paris', countryCode: 'FR' } as Bite;

    expect(getLocalizedRegionName(bite, 'en')).toBe('Paris, France');
  });

  it('should localize the country name based on the given language', () => {
    const bite = { city: 'Paris', countryCode: 'FR' } as Bite;

    expect(getLocalizedRegionName(bite, 'de')).toBe('Paris, Frankreich');
  });

  it('should return only the city when countryCode is missing', () => {
    const bite = { city: 'Paris' } as Bite;

    expect(getLocalizedRegionName(bite, 'en')).toBe('Paris');
  });

  it('should return only the localized country name when city is missing', () => {
    const bite = { countryCode: 'FR' } as Bite;

    expect(getLocalizedRegionName(bite, 'en')).toBe('France');
  });

  it('should return an empty string when neither city nor countryCode is set', () => {
    const bite = {} as Bite;

    expect(getLocalizedRegionName(bite, 'en')).toBe('');
  });

  it('should fall back to the raw country code when it cannot be localized', () => {
    const bite = { city: 'Paris', countryCode: 'XX' } as Bite;

    expect(getLocalizedRegionName(bite, 'en')).toBe('Paris, XX');
  });
});
