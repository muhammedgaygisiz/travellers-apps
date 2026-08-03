import { AppActions } from '../actions';
import { reducer } from '../reducer';
import { AppSlice } from '../app-slice.model';
import type { PublicUser, Settings } from 'model';
import { BiteActions } from '../../bites/actions';
import { fromAuth } from 'ta-firestore';
import { routerRequestAction } from '@ngrx/router-store';

describe('App Reducer', () => {
  describe('fromAuth.logoutSucceeded', () => {
    it('should reset the state to initial values', () => {
      const INITIAL_STATE: AppSlice = {
        profile: { displayName: 'Test User' } as PublicUser,
        settings: { emailUpdates: true } as Settings,
        loading: { home: true },
        exchangeRates: { EUR: 1 },
        errorLoadingGpsPosition: false,
        profileMetadata: {
          followers: 0,
          following: 0,
          isFollowedByMe: false,
        },
      };

      const NEW_STATE: AppSlice = {
        profile: undefined,
        settings: {
          location: false,
          emailUpdates: false,
          theme: 'light',
          currency: 'EUR',
          favoriteCurrencies: [],
          nearby: 2000,
          language: 'en',
        },
        loading: { home: true },
        exchangeRates: { EUR: 1 },
        errorLoadingGpsPosition: false,
        profileMetadata: {
          followers: 0,
          following: 0,
          isFollowedByMe: false,
        },
      };

      const logoutAction = fromAuth.AuthActions.logoutSucceeded();

      expect(reducer(INITIAL_STATE, logoutAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('fromAuth.loginSucceeded', () => {
    it('should set loading:home to true', () => {
      const INITIAL_STATE = { loading: { home: false } } as AppSlice;
      const NEW_STATE = {
        loading: {
          home: true,
        },
      } as AppSlice;

      const loginAction = fromAuth.AuthActions.loginSucceeded();

      expect(reducer(INITIAL_STATE, loginAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedByGPSPositionFromAPI', () => {
    it('should set loading:home to false', () => {
      const INITIAL_STATE = { loading: { home: true } } as AppSlice;
      const NEW_STATE = {
        loading: {
          home: false,
        },
      } as AppSlice;

      const loadedBitesFromApiAction = BiteActions.loadedByGPSPositionFromAPI({
        bites: [],
      });

      expect(reducer(INITIAL_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedGpsPosition', () => {
    it('should set provided position', () => {
      const POSITION_MOCK = {
        latitude: 1,
        longitude: 2,
      };
      const INITIAL_STATE = {} as AppSlice;
      const NEW_STATE = {
        position: POSITION_MOCK,
        errorLoadingGpsPosition: false,
        reloading: {
          home: false,
        },
      } as AppSlice;

      const loadedGpsPositionAction = AppActions.loadedGPSPosition({
        position: { coords: POSITION_MOCK },
      });

      expect(reducer(INITIAL_STATE, loadedGpsPositionAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('updatedGPSPositionWithoutReload', () => {
    it('advances the position but leaves the loaded bites in place', () => {
      const INITIAL_STATE = {
        position: { latitude: 1, longitude: 2 },
        bites: ['existing-bite'],
        reloading: { home: true },
      } as unknown as AppSlice;

      const action = AppActions.updatedGPSPositionWithoutReload({
        position: { coords: { latitude: 3, longitude: 4 } },
      });

      expect(reducer(INITIAL_STATE, action)).toEqual({
        position: { latitude: 3, longitude: 4 },
        bites: ['existing-bite'],
        errorLoadingGpsPosition: false,
        locationPermissionState: undefined,
        reloading: { home: false },
      });
    });

    /**
     * Restoring location access in the settings page rarely moves the user
     * 100 m, so the successful re-read lands here. Leaving the flag set kept
     * the error card on screen next to a working position (issue #1183).
     */
    it('clears a stale error even when the movement is below the threshold', () => {
      const INITIAL_STATE = {
        position: { latitude: 1, longitude: 2 },
        errorLoadingGpsPosition: true,
        locationPermissionState: 'denied',
      } as unknown as AppSlice;

      const action = AppActions.updatedGPSPositionWithoutReload({
        position: { coords: { latitude: 1, longitude: 2 } },
      });

      expect(reducer(INITIAL_STATE, action)).toEqual(
        expect.objectContaining({
          errorLoadingGpsPosition: false,
          locationPermissionState: undefined,
        }),
      );
    });
  });

  describe('errorLoadingGpsPosition', () => {
    it('should keep old position', () => {
      const INITIAL_STATE = {
        position: { latitude: 1, longitude: 2 },
      } as AppSlice;
      const NEW_STATE = {
        position: { latitude: 1, longitude: 2 },
        errorLoadingGpsPosition: true,
        locationPermissionState: undefined,
        loading: {
          home: false,
        },
        reloading: {
          home: false,
        },
      } as AppSlice;

      const errorLoadingGpsPositionAction = AppActions.errorLoadingGPSPosition({
        error: 'error',
      });

      expect(reducer(INITIAL_STATE, errorLoadingGpsPositionAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should record the permission state that blocked the read', () => {
      const action = AppActions.errorLoadingGPSPosition({
        error: 'error',
        permissionState: 'denied',
      });

      expect(reducer({} as AppSlice, action)).toEqual(
        expect.objectContaining({ locationPermissionState: 'denied' }),
      );
    });
  });

  describe('loadedSettingsFromApi', () => {
    it('should set settings', () => {
      const SETTINGS_MOCK = { emailUpdates: true } as Settings;
      const INITIAL_STATE = {} as AppSlice;
      const NEW_STATE = {
        settings: SETTINGS_MOCK,
      } as AppSlice;

      const loadedSettingsFromApiAction = AppActions.loadedSettingsFromAPI({
        settings: SETTINGS_MOCK,
      });

      expect(reducer(INITIAL_STATE, loadedSettingsFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setPublicProfile', () => {
    it('should set public profile', () => {
      const PUBLIC_PROFILE_MOCK = { displayName: 'test' } as PublicUser;
      const INITIAL_STATE = {} as AppSlice;
      const NEW_STATE = {
        profile: PUBLIC_PROFILE_MOCK,
      } as AppSlice;

      const setPublicProfileAction = AppActions.setPublicProfile({
        profile: PUBLIC_PROFILE_MOCK,
      });

      expect(reducer(INITIAL_STATE, setPublicProfileAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedExchangeRatesFromApi', () => {
    it('should set exchange rates', () => {
      const EXCHANGE_RATES_MOCK = { EUR: 1.2, USD: 1.1 };
      const INITIAL_STATE = {} as AppSlice;
      const NEW_STATE = {
        exchangeRates: EXCHANGE_RATES_MOCK,
      } as unknown as AppSlice;

      const loadedExchangeRatesFromApiAction =
        AppActions.loadedExchangeRatesFromAPI({
          exchangeRates: EXCHANGE_RATES_MOCK,
        });

      expect(reducer(INITIAL_STATE, loadedExchangeRatesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('reloadGPSPosition', () => {
    it('should set reloading:home to true', () => {
      const INITIAL_STATE = {
        reloading: { home: false },
      } as AppSlice;
      const NEW_STATE = {
        reloading: { home: true },
      } as AppSlice;

      const reloadGPSPositionAction = AppActions.reloadGPSPosition();

      expect(reducer(INITIAL_STATE, reloadGPSPositionAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('clearGPSError', () => {
    it('should set errorLoadingGpsPosition to false', () => {
      const INITIAL_STATE = {
        errorLoadingGpsPosition: true,
      } as AppSlice;
      const NEW_STATE = {
        errorLoadingGpsPosition: false,
      } as AppSlice;

      const clearGPSErrorAction = AppActions.clearGPSError();

      expect(reducer(INITIAL_STATE, clearGPSErrorAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedProfileMetadata', () => {
    it('should set profileMetadata', () => {
      const INITIAL_STATE = {
        profileMetadata: {
          followers: 0,
          following: 0,
          isFollowedByMe: false,
        },
      } as AppSlice;
      const NEW_STATE = {
        profileMetadata: {
          followers: 10,
          following: 5,
          isFollowedByMe: true,
        },
      } as AppSlice;

      const loadedProfileMetadataAction = AppActions.loadedProfileMetadata({
        followers: 10,
        following: 5,
        isFollowedByMe: true,
      });

      expect(reducer(INITIAL_STATE, loadedProfileMetadataAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('routerRequestAction', () => {
    it('should reset profileMetadata fields', () => {
      const INITIAL_STATE = {
        profileMetadata: {
          followers: 10,
          following: 5,
          isFollowedByMe: true,
        },
      } as AppSlice;
      const NEW_STATE = {
        profileMetadata: {
          followers: 0,
          following: 0,
          isFollowedByMe: false,
        },
      } as AppSlice;

      const action = routerRequestAction(
        {} as unknown as Parameters<typeof routerRequestAction>[0],
      );

      expect(reducer(INITIAL_STATE, action)).toEqual(NEW_STATE);
    });
  });

  describe('followedUser', () => {
    it('should optimistically increment followers and mark as followed', () => {
      const INITIAL_STATE = {
        profileMetadata: { followers: 2, following: 5, isFollowedByMe: false },
      } as AppSlice;

      expect(reducer(INITIAL_STATE, AppActions.followedUser())).toEqual({
        profileMetadata: { followers: 3, following: 5, isFollowedByMe: true },
      } as AppSlice);
    });
  });

  describe('unfollowedUser', () => {
    it('should optimistically decrement followers and clear followed', () => {
      const INITIAL_STATE = {
        profileMetadata: { followers: 3, following: 5, isFollowedByMe: true },
      } as AppSlice;

      expect(reducer(INITIAL_STATE, AppActions.unfollowedUser())).toEqual({
        profileMetadata: { followers: 2, following: 5, isFollowedByMe: false },
      } as AppSlice);
    });

    it('should not decrement followers below zero', () => {
      const INITIAL_STATE = {
        profileMetadata: { followers: 0, following: 5, isFollowedByMe: false },
      } as AppSlice;

      expect(reducer(INITIAL_STATE, AppActions.unfollowedUser())).toEqual({
        profileMetadata: { followers: 0, following: 5, isFollowedByMe: false },
      } as AppSlice);
    });
  });
});
