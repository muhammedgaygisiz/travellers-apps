import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { Platform } from '@ionic/angular';
import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed } from '@angular/core/testing';
import { fromAuth } from 'ta-firestore';
import { AppActions } from '../actions';
import { AppEffect } from '../effects';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { PublicUser, Settings } from 'model';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../../bite-tribe-store.service';
import { Store } from '@ngrx/store';
import { getEffectsMetadata } from '@ngrx/effects';
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
  followUser: jest.fn(),
  getTotalNumberOfBites: jest.fn(),
  getTotalNumberOfUsers: jest.fn(),
};

describe(AppEffect.name, () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: AppEffect;
  let apiService: BiteTribeApiService;
  let storeService: BiteTribeStoreService;
  let store: Store;
  let dispatchSpy: SpyInstance;

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
    store = TestBed.inject(MockStore);

    dispatchSpy = jest.spyOn(store, 'dispatch').mockImplementation();
  });

  describe('loadTotalNumberBites$', () => {
    beforeEach(() => {
      jest
        .spyOn(apiService, 'getTotalNumberOfBites')
        .mockReturnValue(of(42) as any);
    });

    it('should load total number of bites on loginSucceeded', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loginSucceeded(),
        });

        const expected = 'a';
        const output = {
          a: AppActions.loadedTotalNumberOfBites({ total: 42 }),
        };

        expectObservable(effects.loadTotalNumberBites$).toBe(expected, output);
      });
    });
  });

  describe('loadTotalNumberUsers$', () => {
    beforeEach(() => {
      jest
        .spyOn(apiService, 'getTotalNumberOfUsers')
        .mockReturnValue(of(100) as any);
    });

    it('should load total number of users on loginSucceeded', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loginSucceeded(),
        });

        const expected = 'a';
        const output = {
          a: AppActions.loadedTotalNumberOfUsers({ total: 100 }),
        };

        expectObservable(effects.loadTotalNumberUsers$).toBe(expected, output);
      });
    });
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
          a: fromAuth.AuthActions.loadedUser({ user: {} as any }),
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
    it('should have dispatch false set', () => {
      expect(
        getEffectsMetadata(effects).fetchGpsPosition$?.dispatch,
      ).toBeFalsy();
    });

    it('should dispatch loadedGpsPosition on successful location fetch', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const position = { coords: { latitude: 1, longitude: 2 } };

        getCurrentPositionMock.mockReturnValue(cold('a|', { a: position }));

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        const expected = 'a';
        const output = { a: AppActions.fetchGPSPosition() };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 1, longitude: 2 } },
        }),
      );
    });

    it('should emit errorLoadingGpsPosition and show alert on error', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('GPS Error');
      scheduler.run(({ cold, expectObservable }) => {
        getCurrentPositionMock.mockReturnValue(cold('#', {}, error));

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        const expected = 'a';
        const output = { a: AppActions.fetchGPSPosition() };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.errorLoadingGPSPosition({
          error,
        }),
      );
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
    describe('given user was updated successfully', () => {
      beforeEach(() => {
        jest.spyOn(apiService, 'updateUser').mockReturnValue(of({}) as any);
      });

      it('should save profile to firestore on savePublicProfile', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: AppActions.savePublicProfile({ profile: {} as PublicUser }),
          });

          const expected = 'a';
          const expectedOutput = {
            a: AppActions.savedPublicProfile({
              profile: {} as PublicUser,
            }),
          };
          expectObservable(effects.saveProfileToFirestore$).toBe(
            expected,
            expectedOutput,
          );
        });
      });

      describe('given user call was successful but updated user is undefined', () => {
        beforeEach(() => {
          jest
            .spyOn(apiService, 'updateUser')
            .mockReturnValue(of(undefined) as any);
        });

        it('should emit errorSavingPublicProfile action', () => {
          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('a', {
              a: AppActions.savePublicProfile({
                profile: {} as PublicUser,
              }),
            });

            const expected = 'a';
            const expectedOutput = {
              a: AppActions.errorSavingPublicProfile(),
            };
            expectObservable(effects.saveProfileToFirestore$).toBe(
              expected,
              expectedOutput,
            );
          });
        });
      });

      describe('given update call throws an error', () => {
        beforeEach(() => {
          jest.spyOn(apiService, 'updateUser').mockReturnValue(
            new Observable((subscriber) => {
              subscriber.error(new Error('Update failed'));
            }) as any,
          );
        });

        it('should emit errorSavingPublicProfile action', () => {
          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('a', {
              a: AppActions.savePublicProfile({
                profile: {} as PublicUser,
              }),
            });

            const expected = 'a';
            const expectedOutput = {
              a: AppActions.errorSavingPublicProfile(),
            };
            expectObservable(effects.saveProfileToFirestore$).toBe(
              expected,
              expectedOutput,
            );
          });
        });
      });
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
          a: fromAuth.AuthActions.loadedUser({ user: {} as any }),
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
          a: fromAuth.AuthActions.loadedUser({ user: {} as any }),
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

  describe('followUser$', () => {
    let followUserSpy: SpyInstance;

    beforeEach(() => {
      followUserSpy = jest.spyOn(apiService, 'followUser').mockImplementation();
    });

    it('should call followUser from Store Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const user = { userId: 'user-id' } as PublicUser;
        actions$ = cold('a', {
          a: AppActions.followUser({ user }),
        });

        expectObservable(effects.followUser$);
      });

      expect(followUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('unfollowUser', () => {
    let unfollowUserSpy: SpyInstance;

    beforeEach(() => {
      unfollowUserSpy = jest
        .spyOn(apiService, 'unfollowUser')
        .mockImplementation();
    });

    it('should call unfollowUser from Store Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const user = { userId: 'user-id' } as PublicUser;
        actions$ = cold('a', {
          a: AppActions.unfollowUser({ user }),
        });

        expectObservable(effects.unfollowUser$);
      });

      expect(unfollowUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchFollowMetadata$', () => {
    let fetchFollowMetadataSpy: SpyInstance;

    beforeEach(() => {
      fetchFollowMetadataSpy = jest
        .spyOn(apiService, 'fetchFollowMetadata')
        .mockImplementation();
    });

    it('should call fetchFollowMetadataSpy from Api Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/profile/user-id' } },
          } as any),
        });

        expectObservable(effects.fetchFollowMetadata$);
      });

      expect(fetchFollowMetadataSpy).toHaveBeenCalledTimes(1);
    });
  });
});
