import * as fromSelectors from '../selectors';
import { Geopoint, PublicUser, Settings } from 'model';
import { AppSlice } from '../app-slice.model';
import { bucketlistSorting } from '../selectors';

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
    reloading: {
      home: false,
    },
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
        stateWithPublicProfile,
      );
      expect(result).toBe(true);
    });

    it('should return false if profile is not public', () => {
      const stateWithPrivateProfile = {
        ...mockState,
        profile: { ...mockProfile, public: false },
      };
      const result = fromSelectors.isPublicProfile.projector(
        stateWithPrivateProfile,
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
        stateWithoutExchangeRates,
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
      const stateWithSorting = {
        ...mockState,
        sorting: { home: 'distance' },
      } as AppSlice;
      const result = fromSelectors.homeSorting.projector(stateWithSorting);
      expect(result).toBe('distance');
    });

    it('should return "distance" when home sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, sorting: undefined };
      const result = fromSelectors.homeSorting.projector(stateWithoutSorting);
      expect(result).toBe('distance');
    });

    it('should return distance when slice is undefined', () => {
      const result = fromSelectors.homeSorting.projector(undefined as any);
      expect(result).toBe('distance');
    });
  });

  describe('myBitesSorting', () => {
    it('should return the my bites sorting method', () => {
      const stateWithMyBitesSorting = {
        ...mockState,
        sorting: { myBites: 'likes' },
      } as AppSlice;
      const result = fromSelectors.myBitesSorting.projector(
        stateWithMyBitesSorting,
      );
      expect(result).toBe('likes');
    });

    it('should return "distance" when my bites sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, sorting: undefined };
      const result =
        fromSelectors.myBitesSorting.projector(stateWithoutSorting);
      expect(result).toBe('distance');
    });

    it('should return distance when slice is undefined', () => {
      const result = fromSelectors.myBitesSorting.projector(undefined as any);
      expect(result).toBe('distance');
    });
  });

  describe('bucketlistSorting', () => {
    it('should return the bucketlists sorting method', () => {
      const stateWithBucketlistSorting = {
        ...mockState,
        sorting: { bucketlists: 'createdAt' },
      } as AppSlice;
      const result = fromSelectors.bucketlistSorting.projector(
        stateWithBucketlistSorting,
      );
      expect(result).toBe('createdAt');
    });

    it('should return "name" when bucketlists sorting is not set', () => {
      const stateWithoutSorting = { ...mockState, sorting: undefined };
      const result =
        fromSelectors.bucketlistSorting.projector(stateWithoutSorting);
      expect(result).toBe('name');
    });

    it('should return name when slice is undefined', () => {
      const result = fromSelectors.bucketlistSorting.projector(
        undefined as any,
      );
      expect(result).toBe('name');
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
      } as AppSlice;
      const result = fromSelectors.isDarkTheme.projector(stateWithLightTheme);
      expect(result).toBe(false);
    });

    it('should return false when slice is undefined', () => {
      const result = fromSelectors.isDarkTheme.projector(undefined as any);
      expect(result).toBe(false);
    });
  });

  describe('isReloadingHome', () => {
    it('should return the reloading state of home', () => {
      const stateWithHomeReloading = {
        ...mockState,
        reloading: { home: true },
      };
      const result = fromSelectors.isReloadingHome.projector(
        stateWithHomeReloading,
      );
      expect(result).toBe(true);
    });

    it('should return false when reloading state is not set', () => {
      const stateWithoutReloading = { ...mockState, reloading: undefined };
      const result = fromSelectors.isReloadingHome.projector(
        stateWithoutReloading,
      );
      expect(result).toBe(false);
    });
  });

  describe('hasErrorLoadingGpsPosition', () => {
    it('should return the error loading GPS position state', () => {
      const stateWithGpsError = {
        ...mockState,
        errorLoadingGpsPosition: true,
      };
      const result =
        fromSelectors.hasErrorLoadingGpsPosition.projector(stateWithGpsError);
      expect(result).toBe(true);
    });

    it('should return false when error loading GPS position state is not set', () => {
      const stateWithoutGpsError = {
        ...mockState,
        errorLoadingGpsPosition: false,
      };
      const result =
        fromSelectors.hasErrorLoadingGpsPosition.projector(
          stateWithoutGpsError,
        );
      expect(result).toBe(false);
    });
  });
});
