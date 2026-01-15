import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { Platform } from '@ionic/angular';
import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed } from '@angular/core/testing';
import { fromAuth } from 'ta-firestore';
import { AppActions } from '../actions';
import { AppEffect } from '../effects';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { PublicUser, Settings } from 'model';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../../bite-tribe-store.service';
import SpyInstance = jest.SpyInstance;

const getCurrentPositionMock = jest.fn();
jest.mock('geolocation', () => ({
  getCurrentPosition: (): void => getCurrentPositionMock(),
}));

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  settings$: of({ theme: 'dark' } as Settings),
  publicProfile$: of({ displayName: 'test' } as PublicUser),
  create: jest.fn().mockResolvedValue({
    present: jest.fn(),
  }),
  saveSettings: jest.fn(),
  saveUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  saveUserIfNotExisting: jest.fn(),
  getExchangeRates: jest.fn(),
  reloadGPSPosition: jest.fn(),
};

describe('AppEffect', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: AppEffect;
  let apiService: BiteTribeApiService;
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        AppEffect,
        provideMockActions(() => actions$),
        { provide: BiteTribeApiService, useValue: Mock },
        { provide: Platform, useValue: Mock },
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AppEffect);
    apiService = TestBed.inject(BiteTribeApiService);
    storeService = TestBed.inject(BiteTribeStoreService);
  });

  describe('loadSettingsFromApi$', () => {
    it('should load settings from API on ROOT_EFFECTS_INIT', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

        const expected = 'a';
        const output = {
          a: AppActions.loadedSettingsFromAPI({
            settings: { theme: 'dark' } as Settings,
          }),
        };

        expectObservable(effects.loadSettingsFromApi$).toBe(expected, output);
      });
    });
  });

  describe('loadPublicProfile$', () => {
    it('should do nothing if user is not provided', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

        const expected = '-';

        expectObservable(effects.loadPublicProfile$).toBe(expected);
      });
    });

    it('should load public profile on fromAuth.loadedUser', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({ user: {} }),
        });

        const expected = 'a';
        const output = {
          a: AppActions.setPublicProfile({
            profile: { displayName: 'test' } as any,
          }),
        };

        expectObservable(effects.loadPublicProfile$).toBe(expected, output);
      });
    });
  });

  describe('fetchGpsPosition$', () => {
    it('should emit loadedGpsPosition on successful location fetch', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const user = { id: 1 };
        const position = { coords: { latitude: 1, longitude: 2 } };

        getCurrentPositionMock.mockReturnValue(cold('--a|', { a: position }));

        actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser({ user }) });

        const expected = '--a';
        const output = { a: AppActions.loadedGPSPosition({ position }) };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });
    });

    it('should emit errorLoadingGpsPosition and show alert on error', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      scheduler.run(({ cold, expectObservable }) => {
        const error = new Error('GPS Error');

        getCurrentPositionMock.mockReturnValue(cold('--#', {}, error));

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        const expected = '--a';
        const output = { a: AppActions.errorLoadingGPSPosition({ error }) };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveSettingsToFirestore$', () => {
    let saveSettingsSpy: SpyInstance;

    beforeEach(() => {
      saveSettingsSpy = jest
        .spyOn(apiService, 'saveSettings')
        .mockImplementation();
    });

    it('should save settings on saveSettings', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const settings = { theme: 'dark' } as Settings;
        actions$ = cold('a', {
          a: AppActions.saveSettings({ settings }),
        });

        expectObservable(effects.saveSettingsToFirestore$);
      });

      expect(saveSettingsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveProfileToFirestore$', () => {
    let updateUserSpy: SpyInstance;

    beforeEach(() => {
      updateUserSpy = jest.spyOn(apiService, 'updateUser').mockImplementation();
    });

    it('should save profile to firestore on savePublicProfile', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.savePublicProfile({ profile: {} as PublicUser }),
        });

        expectObservable(effects.saveProfileToFirestore$);
      });

      expect(updateUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveUserAfterLogin$', () => {
    let saveUserIfNotExistingSpy: SpyInstance;

    beforeEach(() => {
      saveUserIfNotExistingSpy = jest
        .spyOn(apiService, 'saveUserIfNotExisting')
        .mockImplementation();
    });

    it('should save user if not existing on loadedUser', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({ user: {} }),
        });

        expectObservable(effects.saveUserAfterLogin$);
      });

      expect(saveUserIfNotExistingSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadExchangeRatesFromApi$', () => {
    beforeEach(() => {
      jest
        .spyOn(apiService, 'getExchangeRates')
        .mockReturnValue(of({ USD: 1, EUR: 0.85 }) as any);
    });

    it('should load exchange rates from API on fromAuth.loadedUser', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({ user: {} }),
        });

        const expected = 'a';
        const output = {
          a: AppActions.loadedExchangeRatesFromAPI({
            exchangeRates: { USD: 1, EUR: 0.85 },
          }),
        };

        expectObservable(effects.loadExchangeRatesFromApi$).toBe(
          expected,
          output,
        );
      });
    });
  });

  describe('reloadGpsOnPageChangeToCreateBite$', () => {
    let reloadGPSPositionSpy: SpyInstance;

    beforeEach(() => {
      reloadGPSPositionSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();
    });

    it('should call reloadGPSPosition from Store Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/new-bite' } },
          } as any),
        });

        expectObservable(effects.reloadGpsOnPageChangeToCreateBite$);
      });

      expect(reloadGPSPositionSpy).toHaveBeenCalledTimes(1);
    });
  });
});
