import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { Platform } from '@ionic/angular';
import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed } from '@angular/core/testing';
import { fromAuth } from 'ta-firestore';
import { AppActions } from '../actions';
import { AppEffect } from '../effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { PublicUser, Settings } from 'model';
import { vi, Mock } from 'vitest';

const getCurrentPositionMock = vi.fn();
vi.mock('geolocation', () => ({
  getCurrentPosition: (): void => getCurrentPositionMock(),
}));

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  settings$: of({ theme: 'dark' } as Settings),
  publicProfile$: of({ displayName: 'test' } as PublicUser),
  create: vi.fn().mockResolvedValue({
    present: vi.fn(),
  }),
  saveSettings: vi.fn(),
  saveUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  saveUserIfNotExisting: vi.fn(),
  getExchangeRates: vi.fn(),
};

describe('AppEffect', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: AppEffect;
  let apiService: BiteTribeApiService;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        AppEffect,
        provideMockActions(() => actions$),
        { provide: BiteTribeApiService, useValue: Mock },
        { provide: Platform, useValue: Mock },
      ],
    });

    effects = TestBed.inject(AppEffect);
    apiService = TestBed.inject(BiteTribeApiService);
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
      const errorSpy = vi
        .spyOn(console, 'error')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
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
    let saveSettingsSpy: Mock;

    beforeEach(() => {
      saveSettingsSpy = vi
        .spyOn(apiService, 'saveSettings')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
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

  describe('goPublicEffect$', () => {
    let saveUserSpy: Mock;

    beforeEach(() => {
      saveUserSpy = vi
        .spyOn(apiService, 'saveUser')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should save user on goPublic', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.goPublic(),
        });

        expectObservable(effects.goPublicEffect$);
      });

      expect(saveUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveProfileToFirestore$', () => {
    let updateUserSpy: Mock;

    beforeEach(() => {
      updateUserSpy = vi
        .spyOn(apiService, 'updateUser')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should save profile to firestore on savePublicProfile', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.savePublicProfile({ publicUser: {} as PublicUser }),
        });

        expectObservable(effects.saveProfileToFirestore$);
      });

      expect(updateUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('goPrivateEffect$', () => {
    let deleteUserSpy: Mock;

    beforeEach(() => {
      deleteUserSpy = vi
        .spyOn(apiService, 'deleteUser')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should delete user on goPrivate', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.goPrivate(),
        });

        expectObservable(effects.goPrivateEffect$);
      });

      expect(deleteUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveUserAfterLogin$', () => {
    let saveUserIfNotExistingSpy: Mock;

    beforeEach(() => {
      saveUserIfNotExistingSpy = vi
        .spyOn(apiService, 'saveUserIfNotExisting')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
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
      vi.spyOn(apiService, 'getExchangeRates').mockReturnValue(
        of({ USD: 1, EUR: 0.85 }) as any,
      );
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
});
