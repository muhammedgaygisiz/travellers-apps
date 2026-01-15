import { AppActions } from '../actions';
import { reducer } from '../reducer';
import { AppSlice } from '../app-slice.model';
import { PublicUser, Settings } from 'model';
import { BiteActions } from '../../bites/actions';
import { fromAuth } from 'ta-firestore';

describe('App Reducer', () => {
  describe('fromAuth.logoutSucceeded', () => {
    it('should reset the state to initial values', () => {
      const INITIAL_STATE: AppSlice = {
        profile: { displayName: 'Test User' } as PublicUser,
        settings: { pushNotifications: true } as Settings,
        loading: { home: true },
        exchangeRates: { EUR: 1 },
        errorLoadingGpsPosition: false,
      };

      const NEW_STATE: AppSlice = {
        profile: undefined,
        settings: {
          pushNotifications: false,
          emailUpdates: false,
          theme: 'light',
          currency: 'EUR',
          nearby: 2000,
        },
        loading: { home: true },
        exchangeRates: { EUR: 1 },
        errorLoadingGpsPosition: false,
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

  describe('errorLoadingGpsPosition', () => {
    it('should keep old position', () => {
      const INITIAL_STATE = {
        position: { latitude: 1, longitude: 2 },
      } as AppSlice;
      const NEW_STATE = {
        position: { latitude: 1, longitude: 2 },
        errorLoadingGpsPosition: true,
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
  });

  describe('loadedSettingsFromApi', () => {
    it('should set settings', () => {
      const SETTINGS_MOCK = { pushNotifications: true } as Settings;
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
});
