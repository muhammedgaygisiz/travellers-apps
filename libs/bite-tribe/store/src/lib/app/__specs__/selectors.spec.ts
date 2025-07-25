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

  describe('isPublicProfile', () => {
    it('should return true when profile exists', () => {
      const result = fromSelectors.isPublicProfile.projector(mockState);
      expect(result).toBe(true);
    });

    it('should return false when profile does not exist', () => {
      const stateWithoutProfile = { ...mockState, profile: undefined };
      const result =
        fromSelectors.isPublicProfile.projector(stateWithoutProfile);
      expect(result).toBe(false);
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
});
