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
import SpyInstance = jest.SpyInstance;
import { fromAuth } from 'ta-firestore';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  bitesByUser: (): Observable<any> => of([]),
  bitesByPosition: (): Observable<any> => of([]),
  bitesByBucketlist: (): Observable<any> => of([]),
  saveNewBite: jest.fn(),
  saveEditedBite: jest.fn(),
  saveTagsToExistingBite: jest.fn(),
  deleteBite: jest.fn(),
  getUserByBiteId: jest.fn(),
  bucketlist: (): WritableSignal<string> => signal(''),
  user: jest.fn(),
  latestBites$: (): Observable<any> => of([]),
};

const BITE_MOCK = {
  id: 'biteId',
} as Bite;

describe(BiteEffects.name, () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: BiteEffects;
  let apiService: BiteTribeApiService;
  let store: MockStore;
  let storeService: BiteTribeStoreService;

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
  });

  describe('loadBitesByCurrentUser$', () => {
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

  describe('loadUserFromBite$', () => {
    let getUserByBiteIdSpy: SpyInstance;
    const BITE_CREATOR_MOCK = {
      snapshot: {
        data: {} as any,
      },
    } as any;

    beforeEach(() => {
      getUserByBiteIdSpy = jest
        .spyOn(apiService, 'getUserByBiteId')
        .mockReturnValue(of(BITE_CREATOR_MOCK));
    });

    it('should do nothing on non-bite url', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/list/' } } as any,
          }),
        });

        expectObservable(effects.loadUserFromBite$);
      });
      expect(getUserByBiteIdSpy).not.toHaveBeenCalled();
    });

    it('should return noPublicCreatorForBite on missing public creator', () => {
      getUserByBiteIdSpy.mockReturnValue(of({ snapshot: undefined }));
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/bite/' } } as any,
          }),
        });

        const expected = 'a';
        const output = { a: BiteActions.noPublicCreatorForBite() };

        expectObservable(effects.loadUserFromBite$).toBe(expected, output);
      });
      expect(getUserByBiteIdSpy).toHaveBeenCalledTimes(1);
    });

    it('should return loadedBiteCreator', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/bite/' } } as any,
          }),
        });

        expectObservable(effects.loadUserFromBite$);

        const expected = 'a';
        const output = {
          a: BiteActions.loadedBiteCreator({
            biteCreator: BITE_CREATOR_MOCK.snapshot.data,
          }),
        };

        expectObservable(effects.loadUserFromBite$).toBe(expected, output);
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
