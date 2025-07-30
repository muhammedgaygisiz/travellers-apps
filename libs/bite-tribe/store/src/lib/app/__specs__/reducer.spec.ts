import {
  errorLoadingGpsPosition,
  goPrivate,
  loadedGpsPosition,
  loadedSettingsFromApi,
  setPublicProfile,
  setHomeFilters,
  clearHomeFilters,
} from '../actions';
import { reducer } from '../reducer';
import { AppSlice } from '../app-slice.model';
import { PublicUser, Settings } from 'model';
import { loadedBitesFromApi } from '../../bites/actions';

describe('App Reducer', () => {
  describe('loadedBitesFromApi', () => {
    it('should set loading:home to false', () => {
      const INITIAL_STATE = { loading: { home: true } } as AppSlice;
      const NEW_STATE = {
        loading: {
          home: false,
        },
      } as AppSlice;

      const loadedBitesFromApiAction = loadedBitesFromApi({ bites: [] });

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
      } as AppSlice;

      const loadedGpsPositionAction = loadedGpsPosition({
        position: { coords: POSITION_MOCK },
      });

      expect(reducer(INITIAL_STATE, loadedGpsPositionAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('errorLoadingGpsPosition', () => {
    it('should set position to undefined', () => {
      const INITIAL_STATE = {
        position: { latitude: 1, longitude: 2 },
      } as AppSlice;
      const NEW_STATE = {
        position: undefined,
      } as AppSlice;

      const errorLoadingGpsPositionAction = errorLoadingGpsPosition({
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

      const loadedSettingsFromApiAction = loadedSettingsFromApi({
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

      const setPublicProfileAction = setPublicProfile({
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

      const goPrivateAction = goPrivate();

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

      const setHomeFiltersAction = setHomeFilters({
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

      const setHomeFiltersAction = setHomeFilters({
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

      const clearHomeFiltersAction = clearHomeFilters();

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

      const clearHomeFiltersAction = clearHomeFilters();

      expect(reducer(INITIAL_STATE, clearHomeFiltersAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });
});
