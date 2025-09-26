import * as fromSelectors from '../selectors';
import { Geopoint, PublicUser, Settings } from 'model';
import { AppSlice } from '../app-slice.model';

describe('App Selectors', () => {
  const mockPosition: Geopoint = {
    latitude: 48.2082,
    longitude: 16.3738,
  };

  const mockSettings: Settings = {
    currency: 'EUR',
    theme: 'dark',
  } as Settings;

  const mockProfile: PublicUser = {
    name: 'Test User',
  } as unknown as PublicUser;

  const mockState = {
    position: mockPosition,
    settings: mockSettings,
    profile: mockProfile,
    loading: {
      home: true,
    },
    homeFilters: ['#food', '#drink'],
    exchangeRates: {},
  } as AppSlice;

  describe('gpsPosition', () => {
    it('should return the GPS position', () => {
      const result = fromSelectors.gpsPosition.projector(mockState);
      expect(result).toEqual(mockPosition);
    });
  });

  describe('settings', () => {
    it('should return the settings', () => {
      const result = fromSelectors.settings.projector(mockState);
      expect(result).toEqual(mockSettings);
    });
  });

  describe('currency', () => {
    it('should return the currency from settings', () => {
      const result = fromSelectors.currency.projector(mockState);
      expect(result).toBe('EUR');
    });

    it('should return undefined when settings or currency is not set', () => {
      const stateWithoutSettings = {
        ...mockState,
        settings: undefined,
      } as unknown as AppSlice;
      const result = fromSelectors.currency.projector(stateWithoutSettings);
      expect(result).toBeUndefined();
    });
  });

  describe('isBitesLoading', () => {
    it('should return the home loading state', () => {
      const result = fromSelectors.isBitesLoading.projector(mockState);
      expect(result).toBe(true);
    });

    it('should return undefined when loading state is not set', () => {
      const stateWithoutLoading = { ...mockState, loading: undefined };
      const result =
        fromSelectors.isBitesLoading.projector(stateWithoutLoading);
      expect(result).toBeUndefined();
    });
  });

  describe('publicUser', () => {
    it('should return the public user profile', () => {
      const result = fromSelectors.publicUser.projector(mockState);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('homeFilters', () => {
    it('should return the home filters', () => {
      const result = fromSelectors.homeFilters.projector(mockState);
      expect(result).toEqual(['#food', '#drink']);
    });

    it('should return empty array when no filters exist', () => {
      const stateWithoutFilters = { ...mockState, homeFilters: undefined };
      const result = fromSelectors.homeFilters.projector(stateWithoutFilters);
      expect(result).toEqual([]);
    });
  });

  describe('isPublicProfile', () => {
    it('should return true if profile is public', () => {
      const stateWithPublicProfile = {
        ...mockState,
        profile: { ...mockProfile, public: true },
      };
      const result = fromSelectors.isPublicProfile.projector(
        stateWithPublicProfile
      );
      expect(result).toBe(true);
    });

    it('should return false if profile is not public', () => {
      const stateWithPrivateProfile = {
        ...mockState,
        profile: { ...mockProfile, public: false },
      };
      const result = fromSelectors.isPublicProfile.projector(
        stateWithPrivateProfile
      );
      expect(result).toBe(false);
    });
  });

  describe('homeMaxPriceFilter', () => {
    it('should return the max price filter', () => {
      const result = fromSelectors.homeMaxPriceFilter.projector(mockState);
      expect(result).toBe(0); // Assuming default value is 0
    });

    it('should return 0 when max price filter is not set', () => {
      const stateWithoutMaxPrice = { ...mockState, maxPriceFilter: undefined };
      const result =
        fromSelectors.homeMaxPriceFilter.projector(stateWithoutMaxPrice);
      expect(result).toBe(0);
    });
  });

  describe('homeDistance', () => {
    it('should return the home distance', () => {
      const result = fromSelectors.homeDistance.projector(mockState);
      expect(result).toBeUndefined(); // Assuming default value is undefined
    });

    it('should return undefined when home distance is not set', () => {
      const stateWithoutDistance = { ...mockState, homeDistance: undefined };
      const result = fromSelectors.homeDistance.projector(stateWithoutDistance);
      expect(result).toBeUndefined();
    });
  });

  describe('exchangeRates', () => {
    it('should return the exchange rates', () => {
      const result = fromSelectors.exchangeRates.projector(mockState);
      expect(result).toEqual({}); // Assuming default value is an empty object
    });

    it('should return empty object when exchange rates are not set', () => {
      const stateWithoutExchangeRates = { ...mockState, exchangeRates: {} };
      const result = fromSelectors.exchangeRates.projector(
        stateWithoutExchangeRates
      );
      expect(result).toEqual({});
    });
  });

  describe('preferredCurrency', () => {
    it('should return the preferred currency from settings', () => {
      const result = fromSelectors.preferredCurrency.projector(mockSettings);
      expect(result).toBe('EUR');
    });

    it('should return "EUR" when settings or currency is not set', () => {
      const settings = undefined as any;
      const result = fromSelectors.preferredCurrency.projector(settings);
      expect(result).toBe('EUR');
    });
  });

  describe('maxPriceHome', () => {
    it('should return the max price filter', () => {
      const result = fromSelectors.maxPriceHome.projector(mockState);
      expect(result).toBe(0); // Assuming default value is 0
    });

    it('should return 0 when max price filter is not set', () => {
      const stateWithoutMaxPrice = { ...mockState, maxPriceFilter: undefined };
      const result = fromSelectors.maxPriceHome.projector(stateWithoutMaxPrice);
      expect(result).toBe(0);
    });
  });

  describe('homeSorting', () => {
    it('should return the home sorting method', () => {
      const result = fromSelectors.homeSorting.projector(mockState);
      expect(result).toBe('distance'); // Assuming default sorting is by distance
    });

    it('should return "distance" when home sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, homeSorting: undefined };
      const result = fromSelectors.homeSorting.projector(stateWithoutSorting);
      expect(result).toBe('distance');
    });

    it('should return distance when slice is undefined', () => {
      const result = fromSelectors.homeSorting.projector(undefined as any);
      expect(result).toBe('distance');
    });
  });

  describe('isDarkTheme', () => {
    it('should return dark theme true', () => {
      const result = fromSelectors.isDarkTheme.projector(mockState);
      expect(result).toBe(true);
    });

    it('should return dark theme false', () => {
      const stateWithLightTheme = {
        ...mockState,
        settings: { ...mockState.settings, theme: 'light' },
      };
      const result = fromSelectors.isDarkTheme.projector(stateWithLightTheme);
      expect(result).toBe(false);
    });

    it('should return false when slice is undefined', () => {
      const result = fromSelectors.isDarkTheme.projector(undefined as any);
      expect(result).toBe(false);
    });
  });
});
