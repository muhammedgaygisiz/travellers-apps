import * as fromSelectors from '../selectors';
import type { Geopoint, PublicUser, Settings } from 'model';
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

  const mockState: AppSlice = {
    position: mockPosition,
    settings: mockSettings,
    profile: mockProfile,
    loading: {
      home: true,
    },
    exchangeRates: {},
    reloading: {
      home: false,
    },
    errorLoadingGpsPosition: false,
    profileMetadata: {
      followers: 0,
      following: 0,
      isFollowedByMe: false,
    },
  };

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
    describe('given slice and settings', () => {
      it('should return the currency from settings', () => {
        const result = fromSelectors.currency.projector(mockState);
        expect(result).toBe('EUR');
      });
    });

    describe('given no settings', () => {
      it('should return undefined', () => {
        const stateWithoutSettings = {
          ...mockState,
          settings: undefined,
        } as unknown as AppSlice;
        const result = fromSelectors.currency.projector(stateWithoutSettings);
        expect(result).toBeUndefined();
      });
    });

    describe('given no slice', () => {
      it('should return undefined', () => {
        const result = fromSelectors.currency.projector(undefined as any);
        expect(result).toBeUndefined();
      });
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

    it('should return undefined when slice is undefined', () => {
      const result = fromSelectors.isBitesLoading.projector(undefined as any);
      expect(result).toBeUndefined();
    });
  });

  describe('publicUser', () => {
    it('should return the public user profile', () => {
      const result = fromSelectors.publicUser.projector(mockState);
      expect(result).toEqual(mockProfile);
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

  describe('userHasSubscriptionTierOne', () => {
    it('should return false if subscriptionTier is not provided', () => {
      const stateWithoutSubscriptionTier = {
        ...mockState,
        profile: {} as any,
      };
      const result = fromSelectors.userHasSubscriptionTierOne.projector(
        stateWithoutSubscriptionTier,
      );
      expect(result).toBe(false);
    });

    it('should return false if profile is not provided', () => {
      const stateWithoutSubscriptionTier = {
        ...mockState,
      };
      const result = fromSelectors.userHasSubscriptionTierOne.projector(
        stateWithoutSubscriptionTier,
      );
      expect(result).toBe(false);
    });

    it('should return false if state is not provided', () => {
      const result = fromSelectors.userHasSubscriptionTierOne.projector(
        undefined as any,
      );
      expect(result).toBe(false);
    });

    it('should return false if subscriptionTier is lower than 1', () => {
      const stateWithSubscriptionTier0 = {
        ...mockState,
        profile: { subscriptionTier: 0 } as any,
      };
      const result = fromSelectors.userHasSubscriptionTierOne.projector(
        stateWithSubscriptionTier0,
      );
      expect(result).toBe(false);
    });

    it('should return true if subscriptionTier is 1', () => {
      const stateWithSubscriptionTier1 = {
        ...mockState,
        profile: { subscriptionTier: 1 } as any,
      };
      const result = fromSelectors.userHasSubscriptionTierOne.projector(
        stateWithSubscriptionTier1,
      );
      expect(result).toBe(true);
    });

    it('should return true if subscriptionTier is more than 1', () => {
      const stateWithSubscriptionTier2 = {
        ...mockState,
        profile: { subscriptionTier: 2 } as any,
      };
      const result = fromSelectors.userHasSubscriptionTierOne.projector(
        stateWithSubscriptionTier2,
      );
      expect(result).toBe(true);
    });
  });

  describe('profileMetadata', () => {
    it('should return the profile metadata', () => {
      const result = fromSelectors.profileMetadata.projector(mockState);
      expect(result).toEqual({
        followers: 0,
        following: 0,
        isFollowedByMe: false,
      });
    });

    it('should return undefined when profile metadata is not set', () => {
      const stateWithoutProfileMetadata = {
        ...mockState,
        profileMetadata: undefined,
      } as any;
      const result = fromSelectors.profileMetadata.projector(
        stateWithoutProfileMetadata,
      );
      expect(result).toBeUndefined();
    });
  });
});
