import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { NavController, Platform } from '@ionic/angular';
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
import { gpsPosition } from '../selectors';

const getCurrentPositionMock = jest.fn();
jest.mock('geolocation', () => ({
  getCurrentPosition: (): void => getCurrentPositionMock(),
}));

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const PlatformMock = {};

const BiteTribeApiServiceMock = {
  publicProfile$: of({ displayName: 'test' } as PublicUser),
  loadSettings: jest.fn(),
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
  unfollowUser: jest.fn(),
  fetchFollowMetadata: jest.fn(),
  uploadProfileImage: jest.fn(),
  updatePhotoUrlInUser: jest.fn(),
};

const NavControllerMock = {};

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
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
        { provide: Platform, useValue: PlatformMock },
        { provide: NavController, useValue: NavControllerMock },
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AppEffect);
    apiService = TestBed.inject(BiteTribeApiService);
    storeService = TestBed.inject(BiteTribeStoreService);
    store = TestBed.inject(MockStore);

    jest.spyOn(storeService, 'user').mockReturnValue({ uid: '1' } as any);
    dispatchSpy = jest.spyOn(store, 'dispatch').mockImplementation();
  });

  describe('loadSettingsFromApi$', () => {
    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('light');
    });

    describe('given settings with dark theme exist', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'loadSettings')
          .mockReturnValue(of({ theme: 'dark' }) as any);
      });

      it('should load settings from API on fromAuth.AuthActions.loadedUser', () => {
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

      it('should set dark theme on document element', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

          expectObservable(effects.loadSettingsFromApi$);
        });

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(
          false,
        );
      });
    });

    describe('given settings without theme', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'loadSettings')
          .mockReturnValue(of({} as Settings) as any);
      });

      it('should not set theme on document element', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

          expectObservable(effects.loadSettingsFromApi$);
        });

        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(document.documentElement.classList.contains('light')).toBe(
          false,
        );
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

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 1, longitude: 2 } },
        }),
      );
    });

    it('should not dispatch loadedGpsPosition when movement is below threshold', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const previousPosition = { latitude: 10, longitude: 20 };
        const smallMovementPosition = {
          coords: { latitude: 10.00001, longitude: 20.00001 },
        };

        (store as MockStore).overrideSelector(gpsPosition, previousPosition);
        getCurrentPositionMock.mockReturnValue(
          cold('a|', { a: smallMovementPosition }),
        );

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 10.00001, longitude: 20.00001 } },
        }),
      );
    });

    it('should dispatch loadedGpsPosition when movement is meaningful', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const previousPosition = { latitude: 10, longitude: 20 };
        const meaningfulMovementPosition = {
          coords: { latitude: 10.002, longitude: 20.002 },
        };

        (store as MockStore).overrideSelector(gpsPosition, previousPosition);
        getCurrentPositionMock.mockReturnValue(
          cold('a|', { a: meaningfulMovementPosition }),
        );

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 10.002, longitude: 20.002 } },
        }),
      );
    });

    it('should dispatch clearReloadGPSPosition if no meaningful movement', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const previousPosition = { latitude: 10, longitude: 20 };
        const smallMovementPosition = {
          coords: { latitude: 10.00001, longitude: 20.00001 },
        };

        (store as MockStore).overrideSelector(gpsPosition, previousPosition);
        getCurrentPositionMock.mockReturnValue(
          cold('a|', { a: smallMovementPosition }),
        );

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.clearReloadGPSPosition({
          reason: 'No meaningful movement detected',
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

  describe('saveProfileToFirestore$', () => {
    describe('given no photo change', () => {
      describe('and user was updated successfully', () => {
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

    describe('given a new photo', () => {
      beforeEach(() => {
        jest.spyOn(apiService, 'updateUser').mockReturnValue(of({}) as any);
      });

      it('should save profile to firestore and dispatch uploadProfileImage on savePublicProfile', () => {
        scheduler.run(({ cold, expectObservable }) => {
          const profile = {
            displayName: 'test',
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          } as PublicUser;
          actions$ = cold('a', {
            a: AppActions.savePublicProfile({ profile }),
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

        expect(dispatchSpy).toHaveBeenCalledWith(
          AppActions.uploadProfileImage({
            profile: {
              photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            } as PublicUser,
          }),
        );
      });
    });
  });

  describe('uploadProfileImage$', () => {
    let uploadProfileImageSpy: SpyInstance;

    beforeEach(() => {
      uploadProfileImageSpy = jest
        .spyOn(apiService, 'uploadProfileImage')
        .mockImplementation();
    });

    it('should call uploadProfileImage from Api Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const profile = {
          displayName: 'test',
          photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        } as PublicUser;
        actions$ = cold('a', {
          a: AppActions.uploadProfileImage({ profile }),
        });

        expectObservable(effects.uploadProfileImage$);
      });

      expect(uploadProfileImageSpy).toHaveBeenCalledTimes(1);
    });

    describe('callback fn of uploadProfileImage', () => {
      describe('given upload completed', () => {
        it('should dispatch uploadedProfileImage with image path', () => {
          const callbackFn = jest.fn();
          uploadProfileImageSpy.mockImplementation(
            (profile: PublicUser, cb: (p: any) => void): void => {
              callbackFn(profile, cb);
              cb({
                uploadParams: { evt: { completed: true } },
                imagePath: 'path/to/uploaded/image.jpg',
              });
            },
          );

          scheduler.run(({ cold, expectObservable }) => {
            const profile = {
              displayName: 'test',
              photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            } as PublicUser;
            actions$ = cold('a', {
              a: AppActions.uploadProfileImage({ profile }),
            });

            expectObservable(effects.uploadProfileImage$);
          });
        });
      });

      describe('given upload not completed yet', () => {
        it('should dispatch uploadingProfileImage with progress', () => {
          const callbackFn = jest.fn();
          uploadProfileImageSpy.mockImplementation(
            (profile: PublicUser, cb: (p: any) => void): void => {
              callbackFn(profile, cb);
              cb({
                uploadParams: { evt: { completed: false, progress: 50 } },
                imagePath: 'path/to/uploaded/image.jpg',
              });
            },
          );

          scheduler.run(({ cold, expectObservable }) => {
            const profile = {
              displayName: 'test',
              photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            } as PublicUser;
            actions$ = cold('a', {
              a: AppActions.uploadProfileImage({ profile }),
            });

            expectObservable(effects.uploadProfileImage$);
          });

          expect(dispatchSpy).toHaveBeenCalledWith(
            AppActions.uploadingProfileImage({
              progress: { evt: { completed: false, progress: 50 } } as any,
              profile: {
                displayName: 'test',
                photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
              } as PublicUser,
              imagePath: 'path/to/uploaded/image.jpg',
            }),
          );
        });
      });
    });
  });

  describe('updatePhotoUrlInProfile', () => {
    let updatePhotoUrlInUserSpy: SpyInstance;

    beforeEach(() => {
      updatePhotoUrlInUserSpy = jest
        .spyOn(apiService, 'updatePhotoUrlInUser')
        .mockImplementation();
    });

    it('should call updatePhotoUrlInUser from Api Service with new photoUrl after photo upload', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const profile = {
          displayName: 'test',
          photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        } as PublicUser;
        const imagePath = 'path/to/uploaded/image.jpg';
        actions$ = cold('a', {
          a: AppActions.uploadedProfileImage({ profile, imagePath }),
        });

        expectObservable(effects.updatePhotoUrlInProfile$);
      });

      expect(updatePhotoUrlInUserSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit updatedPhotoUrlInProfile', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const profile = {
          displayName: 'test',
          photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        } as PublicUser;
        const imagePath = 'path/to/uploaded/image.jpg';
        const updatedUser = { ...profile, photoUrl: imagePath } as PublicUser;

        jest
          .spyOn(apiService, 'updatePhotoUrlInUser')
          .mockReturnValue(of(updatedUser) as any);

        actions$ = cold('a', {
          a: AppActions.uploadedProfileImage({ profile, imagePath }),
        });

        const expected = 'a';
        const expectedOutput = {
          a: AppActions.updatedPhotoUrlInProfile({
            profile: updatedUser,
          }),
        };
        expectObservable(effects.updatePhotoUrlInProfile$).toBe(
          expected,
          expectedOutput,
        );
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
