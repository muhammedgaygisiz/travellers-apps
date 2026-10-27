import {
  COUNTRIES,
  countContinents,
  countryCodeOfOutline,
  normalizeCountryCodes,
} from '../countries';
import { toCountryOutlines } from '../globe-outlines';
import { readWorldAtlas } from './world-atlas';

describe('countries', () => {
  describe('COUNTRIES', () => {
    it('should give every numeric id to one country only', () => {
      const numerics = Object.values(COUNTRIES)
        .map(([numeric]) => numeric)
        .filter(Boolean);

      expect(new Set(numerics).size).toBe(numerics.length);
    });

    it.each(['coarse', 'fine'] as const)(
      'should name a country for every numbered %s outline',
      (detail) => {
        const unnamed = toCountryOutlines(readWorldAtlas(detail)).filter(
          (outline) => outline.feature.id !== undefined && !outline.countryCode,
        );

        expect(unnamed.map((outline) => outline.feature.id)).toEqual([]);
      },
    );
  });

  describe('countryCodeOfOutline', () => {
    it('should read the alpha-2 code from the numeric id', () => {
      expect(countryCodeOfOutline('040', 'Austria')).toBe('AT');
    });

    it('should pad a numeric id given without its leading zeros', () => {
      expect(countryCodeOfOutline(40, 'Austria')).toBe('AT');
    });

    it('should match Kosovo by name, as its outline has no id', () => {
      expect(countryCodeOfOutline(undefined, 'Kosovo')).toBe('XK');
    });

    it('should name no country for an outline that is none', () => {
      expect(countryCodeOfOutline(undefined, 'Somaliland')).toBeUndefined();
    });
  });

  describe('normalizeCountryCodes', () => {
    it('should trim, upper-case and de-duplicate the codes', () => {
      expect(normalizeCountryCodes([' at', 'AT', 'th ', '', null])).toEqual([
        'AT',
        'TH',
      ]);
    });

    it('should give no codes for none', () => {
      expect(normalizeCountryCodes(undefined)).toEqual([]);
    });
  });

  describe('countContinents', () => {
    it('should count each continent once', () => {
      expect(countContinents(['AT', 'DE', 'TH', 'JP', 'US'])).toBe(3);
    });

    it('should ignore a code it does not know', () => {
      expect(countContinents(['AT', 'ZZ'])).toBe(1);
    });

    it('should count no continent for no countries', () => {
      expect(countContinents([])).toBe(0);
    });
  });
});
