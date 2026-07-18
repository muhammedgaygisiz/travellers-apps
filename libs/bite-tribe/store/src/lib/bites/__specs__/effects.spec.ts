import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteEffects } from '../effects';
import { BiteActions } from '../actions';
import type { Bite } from 'model';
import { routerNavigatedAction } from '@ngrx/router-store';
import { AppActions } from '../../app/actions';
import { BiteTribeStoreService } from '../../bite-tribe-store.service';
import { signal, WritableSignal } from '@angular/core';
import { BucketlistActions } from '../../bucketlists/actions';
import { PATH } from 'utils';
import { fromAuth } from 'ta-firestore';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import type { Action } from '@ngrx/store';

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  expect(actual).toEqual(expected);
};

const mockToastPresent = jest.fn().mockResolvedValue(undefined);
const mockToastOnDidDismiss = jest.fn().mockResolvedValue(undefined);
const mockToastCreate = jest.fn().mockResolvedValue({
  present: mockToastPresent,
  onDidDismiss: mockToastOnDidDismiss,
});
const MockToastController = {
  create: mockToastCreate,
};

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
};

const Mock = {
  bitesByUser: (): ReturnType<BiteTribeApiService['bitesByUser']> =>
    of([]) as unknown as ReturnType<BiteTribeApiService['bitesByUser']>,
  bitesByPosition: (): ReturnType<BiteTribeApiService['bitesByPosition']> =>
    of([]) as unknown as ReturnType<BiteTribeApiService['bitesByPosition']>,
  biteById: (): ReturnType<BiteTribeApiService['biteById']> =>
    of(undefined) as unknown as ReturnType<BiteTribeApiService['biteById']>,
  bitesByBucketlist: (): ReturnType<BiteTribeApiService['bitesByBucketlist']> =>
    of([]) as unknown as ReturnType<BiteTribeApiService['bitesByBucketlist']>,
  saveEditedBite: jest.fn(),
  saveTagsToExistingBite: jest.fn(),
  deleteBite: jest.fn(),
  getUserByBiteId: jest.fn(),
  bucketlist: (): WritableSignal<string> => signal(''),
  user: jest.fn(),
  latestBites$: (): ReturnType<BiteTribeApiService['latestBites$']> =>
    of([]) as unknown as ReturnType<BiteTribeApiService['latestBites$']>,
  getUserById: (): ReturnType<BiteTribeApiService['getUserById']> =>
    of() as unknown as ReturnType<BiteTribeApiService['getUserById']>,
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
  let actions$: Observable<Action> = of({ type: 'INIT' });
  let effects: BiteEffects;
  let apiService: BiteTribeApiService;
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    mockToastCreate.mockClear();
    mockToastPresent.mockClear();
    mockToastOnDidDismiss.mockClear();
    MockTranslocoService.translate.mockClear();
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
        { provide: ToastController, useValue: MockToastController },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    effects = TestBed.inject(BiteEffects);
    apiService = TestBed.inject(BiteTribeApiService);
    storeService = TestBed.inject(BiteTribeStoreService);
  });

  describe('loadBitesByCurrentUser$', () => {
    describe('given a user', () => {
      beforeEach(() => {
        jest
          .spyOn(storeService, 'user')
          .mockReturnValue(
            {} as unknown as ReturnType<typeof storeService.user>,
          );
      });

      it('should load bites from API on my-bites page entry', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: {
                event: { urlAfterRedirects: PATH.MY_BITES },
              } as unknown as Parameters<
                typeof routerNavigatedAction
              >[0]['payload'],
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
              payload: {
                event: { urlAfterRedirects: PATH.MY_PROFILE },
              } as unknown as Parameters<
                typeof routerNavigatedAction
              >[0]['payload'],
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
              payload: {
                event: { urlAfterRedirects: PATH.MY_PROFILE },
              } as unknown as Parameters<
                typeof routerNavigatedAction
              >[0]['payload'],
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
        payload: {
          event: { urlAfterRedirects: PATH.PROFILE },
        } as unknown as Parameters<typeof routerNavigatedAction>[0]['payload'],
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
          (
            effects as unknown as { biteCreatorId: () => string }
          ).biteCreatorId = (): string => 'biteCreatorId';
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
            position: {} as unknown as Parameters<
              typeof AppActions.loadedGPSPosition
            >[0]['position'],
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
              } as unknown as Parameters<
                typeof routerNavigatedAction
              >[0]['payload'],
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
          .mockReturnValue(
            undefined as unknown as ReturnType<typeof storeService.bucketlist>,
          );
      });

      it('should return noBucketlistFound on navigating to bucketlist url', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: routerNavigatedAction({
              payload: {
                event: { urlAfterRedirects: '/my-bucketlists/123' },
              } as unknown as Parameters<
                typeof routerNavigatedAction
              >[0]['payload'],
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

  describe('saveEditedBiteToFirestore$', () => {
    describe('given a successful save call', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'saveEditedBite')
          .mockReturnValue(
            of(BITE_MOCK) as unknown as ReturnType<
              BiteTribeApiService['saveEditedBite']
            >,
          );
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

      it('should show a success toast when bite is updated', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.saveExistingBite({
              bite: {} as Bite,
            }),
          });

          expectObservable(effects.saveEditedBiteToFirestore$);
        });

        expect(mockToastCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'bite-updated-successfully',
            color: 'success',
          }),
        );
      });
    });

    describe('given an erroneous save call', () => {
      it('should return errorSavingBite on saveExistingBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          jest
            .spyOn(apiService, 'saveEditedBite')
            .mockReturnValue(
              cold(
                '#',
                {},
                new Error('Error saving bite'),
              ) as unknown as ReturnType<BiteTribeApiService['saveEditedBite']>,
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
          .mockReturnValue(
            of(BITE_MOCK) as unknown as ReturnType<
              BiteTribeApiService['deleteBite']
            >,
          );
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

      it('should show a success toast when bite is deleted', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BiteActions.deleteBite({
              bite: {} as Bite,
            }),
          });

          expectObservable(effects.deleteBite$);
        });

        expect(mockToastCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'bite-deleted-successfully',
            color: 'success',
          }),
        );
      });
    });

    describe('given an erroneous delete call', () => {
      it('should return errorDeletingBite on deleteBite', () => {
        scheduler.run(({ cold, expectObservable }) => {
          jest
            .spyOn(apiService, 'deleteBite')
            .mockReturnValue(
              cold(
                '#',
                {},
                new Error('Error deleting bite'),
              ) as unknown as ReturnType<BiteTribeApiService['deleteBite']>,
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

          const expected = '200ms (a|)';
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
