import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BiteEffects } from '../effects';
import { BiteActions } from '../actions';
import type { Bite } from 'model';
import { routerNavigatedAction } from '@ngrx/router-store';
import { bite } from '../selectors';
import { AppActions } from '../../app/actions';
import { BiteTribeStoreService } from '../../bite-tribe-store.service';
import { signal, WritableSignal } from '@angular/core';
import { BucketlistActions } from '../../bucketlists/actions';
import { PATH } from 'utils';
import { fromAuth } from 'ta-firestore';
import { biteId as routeBiteId } from '../../router/selectors';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  bitesByUser: (): Observable<any> => of([]),
  bitesByPosition: (): Observable<any> => of([]),
  biteById: (): Observable<any> => of({}),
  bitesByBucketlist: (): Observable<any> => of([]),
  saveNewBite: jest.fn(),
  uploadImage: (): Observable<any> => of({}),
  updateImagePathInBite: (): Observable<any> => of([]),
  saveEditedBite: jest.fn(),
  saveTagsToExistingBite: jest.fn(),
  deleteBite: jest.fn(),
  getUserByBiteId: jest.fn(),
  bucketlist: (): WritableSignal<string> => signal(''),
  user: jest.fn(),
  latestBites$: (): Observable<any> => of([]),
  getUserById: (): Observable<any> => of({}),
};

const BITE_MOCK = {
  id: 'biteId',
  position: {
    latitude: 48.2082,
    longitude: 16.3738,
  },
} as Bite;

describe(BiteEffects.name, () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: BiteEffects;
  let apiService: BiteTribeApiService;
  let store: MockStore;
  let storeService: BiteTribeStoreService;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        BiteEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            bites: {
              ids: [],
              entities: {},
            },
          },
        }),
        { provide: BiteTribeApiService, useValue: Mock },
        { provide: BiteTribeStoreService, useValue: Mock },
      ],
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(bite, BITE_MOCK);
    effects = TestBed.inject(BiteEffects);
    apiService = TestBed.inject(BiteTribeApiService);
    storeService = TestBed.inject(BiteTribeStoreService);

    dispatchSpy = jest.spyOn(store, 'dispatch');
  });

  describe('loadBitesByCurrentUser$', () => {
    describe('given a user', () => {
      beforeEach(() => {
        jest.spyOn(storeService, 'user').mockReturnValue({} as any);
      });

      it('should load bites from API on my-bites page entry', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: { event: { urlAfterRedirects: PATH.MY_BITES } } as any,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.loadedByUserFromAPI({ bites: [] }),
          };

          expectObservable(effects.loadBitesByCurrentUser$).toBe(
            expected,
            output,
          );
        });
      });

      it('should load bites from API on my-profile page entry', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: { event: { urlAfterRedirects: PATH.MY_PROFILE } } as any,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.loadedByUserFromAPI({ bites: [] }),
          };

          expectObservable(effects.loadBitesByCurrentUser$).toBe(
            expected,
            output,
          );
        });
      });
    });

    describe('with no user id', () => {
      beforeEach(() => {
        jest.spyOn(storeService, 'user').mockReturnValue(null);
      });

      it('should return empty bites array', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: { event: { urlAfterRedirects: PATH.MY_PROFILE } } as any,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.loadedByUserFromAPI({ bites: [] }),
          };

          expectObservable(effects.loadBitesByCurrentUser$).toBe(
            expected,
            output,
          );
        });
      });
    });
  });

  describe('loadBitesForBiteCreatorProfile', () => {
    describe('given a bite creator profile page entry', () => {
      const BITE_CREATOR_PROFILE_PAGE_ENTRY = routerNavigatedAction({
        payload: { event: { urlAfterRedirects: PATH.PROFILE } } as any,
      });

      describe('and no bite creator id', () => {
        it('should return noBitesForBiteCreatorProfile', () => {
          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('a', {
              a: BITE_CREATOR_PROFILE_PAGE_ENTRY,
            });

            const expected = 'a';
            const output = {
              a: BiteActions.noBitesForBiteCreatorProfile(),
            };

            expectObservable(effects.loadBitesForBiteCreatorProfile$).toBe(
              expected,
              output,
            );
          });
        });
      });

      describe('and a bite creator id is defined', () => {
        beforeEach(() => {
          (effects as any)['biteCreatorId'] = (): string => 'biteCreatorId';
        });

        it('should load bites from API', () => {
          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('a', {
              a: BITE_CREATOR_PROFILE_PAGE_ENTRY,
            });

            const expected = 'a';
            const output = {
              a: BiteActions.loadedByUserFromAPI({ bites: [] }),
            };

            expectObservable(effects.loadBitesForBiteCreatorProfile$).toBe(
              expected,
              output,
            );
          });
        });
      });
    });
  });

  describe('loadBitesByGpsPosition$', () => {
    it('should load bites from API on loadedGPSPosition', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.loadedGPSPosition({
            position: {} as any,
          }),
        });

        const expected = 'a';
        const output = {
          a: BiteActions.loadedByGPSPositionFromAPI({ bites: [] }),
        };

        expectObservable(effects.loadBitesByGpsPosition$).toBe(
          expected,
          output,
        );
      });
    });
  });

  describe('loadBitesForRestaurantPage$', () => {
    it('should load bites around source bite position on restaurant bites page entry', () => {
      const bitesByPositionSpy = jest.spyOn(apiService, 'bitesByPosition');

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: {
              event: { urlAfterRedirects: '/bite/biteId/restaurant/123/bites' },
            } as any,
          }),
        });

        const expected = 'a';
        const output = {
          a: BiteActions.loadedByGPSPositionFromAPI({ bites: [] }),
        };

        expectObservable(effects.loadBitesForRestaurantPage$).toBe(
          expected,
          output,
        );
      });

      expect(bitesByPositionSpy).toHaveBeenCalledWith({
        coords: {
          latitude: 48.2082,
          longitude: 16.3738,
        },
      });
    });

    it('should resolve source bite by id when bite selector has no source bite', () => {
      store.overrideSelector(bite, undefined as any);
      store.overrideSelector(routeBiteId, 'biteId');
      store.refreshState();
      const biteByIdSpy = jest
        .spyOn(apiService, 'biteById')
        .mockReturnValue(of(BITE_MOCK) as any);

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: {
              event: { urlAfterRedirects: '/bite/biteId/restaurant/123/bites' },
            } as any,
          }),
        });

        const expected = 'a';
        const output = {
          a: BiteActions.loadedByGPSPositionFromAPI({ bites: [] }),
        };

        expectObservable(effects.loadBitesForRestaurantPage$).toBe(
          expected,
          output,
        );
      });

      expect(biteByIdSpy).toHaveBeenCalledWith('biteId');
    });

    it('should fall back to route bite id when source bite has no position', () => {
      store.overrideSelector(bite, { id: 'biteId' } as Bite);
      store.overrideSelector(routeBiteId, 'biteId');
      store.refreshState();

      const biteByIdSpy = jest
        .spyOn(apiService, 'biteById')
        .mockReturnValue(of(BITE_MOCK) as any);

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: {
              event: { urlAfterRedirects: '/bite/biteId/restaurant/123/bites' },
            } as any,
          }),
        });

        const expected = 'a';
        const output = {
          a: BiteActions.loadedByGPSPositionFromAPI({ bites: [] }),
        };

        expectObservable(effects.loadBitesForRestaurantPage$).toBe(
          expected,
          output,
        );
      });

      expect(biteByIdSpy).toHaveBeenCalledWith('biteId');
    });

    it('should emit no action when loaded source bite has no position', () => {
      store.overrideSelector(bite, undefined as any);
      store.overrideSelector(routeBiteId, 'biteId');
      store.refreshState();
      jest
        .spyOn(apiService, 'biteById')
        .mockReturnValue(of({ id: 'biteId' } as Bite) as any);

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: {
              event: { urlAfterRedirects: '/bite/biteId/restaurant/123/bites' },
            } as any,
          }),
        });

        expectObservable(effects.loadBitesForRestaurantPage$).toBe('');
      });
    });

    it('should emit no action when loading source bite by id fails', () => {
      store.overrideSelector(bite, undefined as any);
      store.overrideSelector(routeBiteId, 'biteId');
      store.refreshState();

      scheduler.run(({ cold, expectObservable }) => {
        jest
          .spyOn(apiService, 'biteById')
          .mockReturnValue(cold('#', {}, new Error('load failed')) as any);

        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: {
              event: { urlAfterRedirects: '/bite/biteId/restaurant/123/bites' },
            } as any,
          }),
        });

        expectObservable(effects.loadBitesForRestaurantPage$).toBe('');
      });
    });
  });

  describe('loadBitesByBucketlistId$', () => {
    describe('given a bucketlist', () => {
      it('should load bites from API on navigating to bucketlist url', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: {
                event: { urlAfterRedirects: '/my-bucketlists/123' },
              } as any,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.loadedByBucketlistFromAPI({ bites: [] }),
          };

          expectObservable(effects.loadBitesByBucketlistId$).toBe(
            expected,
            output,
          );
        });
      });
    });

    describe('given no bucketlist', () => {
      beforeEach(() => {
        jest
          .spyOn(storeService, 'bucketlist')
          .mockReturnValue(undefined as any);
      });

      it('should return noBucketlistFound on navigating to bucketlist url', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: {
                event: { urlAfterRedirects: '/my-bucketlists/123' },
              } as any,
            }),
          });

          const expected = 'a';
          const output = {
            a: BucketlistActions.noBucketlistFound(),
          };

          expectObservable(effects.loadBitesByBucketlistId$).toBe(
            expected,
            output,
          );
        });
      });
    });
  });

  describe('saveNewBiteToFirestore$', () => {
    describe('given a successful save call', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'saveNewBite')
          .mockReturnValue(of(BITE_MOCK) as any);
      });

      it('should return savedBite on saveNewBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.saveNewBite({
              bite: {} as Bite,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.savedBite({ bite: BITE_MOCK }),
          };

          expectObservable(effects.saveNewBiteToFirestore$).toBe(
            expected,
            output,
          );
        });
      });
    });

    describe('given a erroneous save call', () => {
      it('should return errorSavingBite on saveNewBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          jest
            .spyOn(apiService, 'saveNewBite')
            .mockReturnValue(
              cold('#', {}, new Error('Error saving bite')) as any,
            );

          actions$ = cold('a', {
            a: BiteActions.saveNewBite({
              bite: {} as Bite,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.errorSavingBite({ bite: {} as Bite }),
          };

          expectObservable(effects.saveNewBiteToFirestore$).toBe(
            expected,
            output,
          );
        });
      });
    });
  });

  describe('uploadImage', () => {
    describe('given a uploadImage action', () => {
      it('should call uploadImage from api service', () => {
        const uploadImageSpy = jest.spyOn(apiService, 'uploadImage');

        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.uploadImage({
              bite: {} as Bite,
            }),
          });

          expectObservable(effects.uploadImage$);
        });

        expect(uploadImageSpy).toHaveBeenCalledTimes(1);
        const callbackFn = uploadImageSpy.mock.calls[0][1];

        // Call with not completed parameter
        callbackFn({ uploadParams: { evt: { completed: false } } } as any);

        expect(dispatchSpy).toHaveBeenCalledWith(
          BiteActions.uploadingImage({
            biteId: undefined,
            imagePath: undefined,
            progress: {
              evt: {
                completed: false,
              },
            },
          } as any),
        );

        // Call with completed parameter
        callbackFn({ uploadParams: { evt: { completed: true } } } as any);

        expect(dispatchSpy).toHaveBeenCalledWith(
          BiteActions.uploadedImage({
            bite: {} as Bite,
            imagePath: undefined,
          } as any),
        );
      });
    });
  });

  describe('updateImagePathInBite$', () => {
    describe('given an uploadedImage action', () => {
      it('should call updateImagePathInBite from api service', () => {
        const updateImagePathInBiteSpy = jest.spyOn(
          apiService,
          'updateImagePathInBite',
        );

        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.uploadedImage({
              bite: {} as Bite,
              imagePath: 'imagePath',
            }),
          });

          expectObservable(effects.updateImagePathInBite$);
        });

        expect(updateImagePathInBiteSpy).toHaveBeenCalledTimes(1);
        expect(updateImagePathInBiteSpy).toHaveBeenCalledWith(
          {} as Bite,
          'imagePath',
        );
      });
    });
  });

  describe('saveEditedBiteToFirestore$', () => {
    describe('given a successful save call', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'saveEditedBite')
          .mockReturnValue(of(BITE_MOCK) as any);
      });

      it('should return savedBite on saveExistingBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.saveExistingBite({
              bite: {} as Bite,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.savedBite({ bite: BITE_MOCK }),
          };

          expectObservable(effects.saveEditedBiteToFirestore$).toBe(
            expected,
            output,
          );
        });
      });
    });

    describe('given an erroneous save call', () => {
      it('should return errorSavingBite on saveExistingBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          jest
            .spyOn(apiService, 'saveEditedBite')
            .mockReturnValue(
              cold('#', {}, new Error('Error saving bite')) as any,
            );

          actions$ = cold('a', {
            a: BiteActions.saveExistingBite({
              bite: {} as Bite,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.errorSavingBite({ bite: {} as Bite }),
          };

          expectObservable(effects.saveEditedBiteToFirestore$).toBe(
            expected,
            output,
          );
        });
      });
    });
  });

  describe('deleteBite$', () => {
    describe('given a successful delete call', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'deleteBite')
          .mockReturnValue(of(BITE_MOCK) as any);
      });

      it('should return deletedBite on deleteBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.deleteBite({
              bite: {} as Bite,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.deletedBite({ bite: BITE_MOCK }),
          };

          expectObservable(effects.deleteBite$).toBe(expected, output);
        });
      });
    });

    describe('given an erroneous delete call', () => {
      it('should return errorDeletingBite on deleteBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          jest
            .spyOn(apiService, 'deleteBite')
            .mockReturnValue(
              cold('#', {}, new Error('Error deleting bite')) as any,
            );

          actions$ = cold('a', {
            a: BiteActions.deleteBite({
              bite: {} as Bite,
            }),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.errorDeletingBite({ bite: {} as Bite }),
          };

          expectObservable(effects.deleteBite$).toBe(expected, output);
        });
      });
    });
  });

  describe('listenToLatest20Bites$', () => {
    describe('on loginSucceeded', () => {
      it('should call api.listenToLatest20Bites', () => {
        const listenToLatest20BitesSpy = jest.spyOn(apiService, 'latestBites$');

        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: fromAuth.AuthActions.loginSucceeded(),
          });

          const expected = 'a';
          const output = {
            a: BiteActions.loadedLatestFromAPI({ bites: [] }),
          };

          expectObservable(effects.listenToLatest20Bites$).toBe(
            expected,
            output,
          );
        });

        expect(listenToLatest20BitesSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
