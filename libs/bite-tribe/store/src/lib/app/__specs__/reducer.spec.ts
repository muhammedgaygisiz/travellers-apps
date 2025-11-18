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
        homeFilters: ['#food'],
        sorting: { home: 'distance' },
        exchangeRates: { EUR: 1 },
        maxPriceFilter: 0,
        errorLoadingGpsPosition: false,
      };

      const NEW_STATE = {
        profile: undefined,
        settings: {
          pushNotifications: false,
          emailUpdates: false,
          theme: 'light',
          currency: 'EUR',
          nearby: 2000,
        },
        loading: { home: true },
        homeFilters: [],
        sorting: {
          home: 'distance',
          myBites: 'distance',
        },
        exchangeRates: { EUR: 1 },
        maxPriceFilter: 0,
        errorLoadingGpsPosition: false,
      } as AppSlice;

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

  describe('loadedBitesFromApi', () => {
    it('should set loading:home to false', () => {
      const INITIAL_STATE = { loading: { home: true } } as AppSlice;
      const NEW_STATE = {
        loading: {
          home: false,
        },
      } as AppSlice;

      const loadedBitesFromApiAction = BiteActions.loadedFromAPI({ bites: [] });

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

  describe('goPrivate', () => {
    it('should set profile to undefined', () => {
      const PUBLIC_PROFILE_MOCK = { displayName: 'test' } as PublicUser;
      const INITIAL_STATE = {
        profile: PUBLIC_PROFILE_MOCK,
      } as AppSlice;
      const NEW_STATE = {
        profile: undefined,
      } as AppSlice;

      const goPrivateAction = AppActions.goPrivate();

      expect(reducer(INITIAL_STATE, goPrivateAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setHomeFilters', () => {
    it('should set home filters', () => {
      const INITIAL_STATE = {
        homeFilters: [],
      } as unknown as AppSlice;
      const NEW_STATE = {
        homeDistance: 0,
        homeFilters: ['#food', '#drink'],
        maxPriceFilter: 0,
      } as AppSlice;

      const setHomeFiltersAction = AppActions.setHomeFilters({
        filters: {
          tagFilters: ['#food', '#drink'],
          distanceFilter: '',
          priceFilter: 0,
        },
      });

      expect(reducer(INITIAL_STATE, setHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should override existing home filters', () => {
      const INITIAL_STATE = {
        homeFilters: ['#old', '#filters'],
      } as AppSlice;
      const NEW_STATE = {
        homeDistance: 0,
        homeFilters: ['#new', '#filters'],
        maxPriceFilter: 0,
      } as AppSlice;

      const setHomeFiltersAction = AppActions.setHomeFilters({
        filters: {
          tagFilters: ['#new', '#filters'],
          distanceFilter: '',
          priceFilter: 0,
        },
      });

      expect(reducer(INITIAL_STATE, setHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('clearHomeFilters', () => {
    it('should clear all home filters', () => {
      const INITIAL_STATE = {
        homeFilters: ['#food', '#drink', '#coffee'],
      } as AppSlice;
      const NEW_STATE = {
        homeFilters: [],
        maxPriceFilter: 0,
      } as unknown as AppSlice;

      const clearHomeFiltersAction = AppActions.clearHomeFilters();

      expect(reducer(INITIAL_STATE, clearHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should handle clearing already empty filters', () => {
      const INITIAL_STATE = {
        homeFilters: [],
      } as unknown as AppSlice;
      const NEW_STATE = {
        homeFilters: [],
        maxPriceFilter: 0,
      } as unknown as AppSlice;

      const clearHomeFiltersAction = AppActions.clearHomeFilters();

      expect(reducer(INITIAL_STATE, clearHomeFiltersAction)).toEqual({
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

  describe('setHomeSorting', () => {
    it('should set home sorting', () => {
      const INITIAL_STATE = {
        sorting: { home: 'distance' },
      } as AppSlice;
      const NEW_STATE = {
        sorting: { home: 'price' },
      } as AppSlice;

      const setHomeSortingAction = AppActions.setHomeSorting({
        sorting: 'price',
      });

      expect(reducer(INITIAL_STATE, setHomeSortingAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setMyBitesSorting', () => {
    it('should set my bites sorting', () => {
      const INITIAL_STATE = {
        sorting: { myBites: 'distance' },
      } as AppSlice;
      const NEW_STATE = {
        sorting: { myBites: 'likes' },
      } as AppSlice;

      const setMyBitesSortingAction = AppActions.setMyBitesSorting({
        sorting: 'likes',
      });

      expect(reducer(INITIAL_STATE, setMyBitesSortingAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setBucketlistSorting', () => {
    it('should set bucketlist sorting', () => {
      const INITIAL_STATE = {
        sorting: { bucketlists: 'name' },
      } as AppSlice;
      const NEW_STATE = {
        sorting: { bucketlists: 'createdAt' },
      } as AppSlice;

      const setBucketlistSortingAction = AppActions.setBucketlistSorting({
        sorting: 'createdAt',
      });

      expect(reducer(INITIAL_STATE, setBucketlistSortingAction)).toEqual({
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
