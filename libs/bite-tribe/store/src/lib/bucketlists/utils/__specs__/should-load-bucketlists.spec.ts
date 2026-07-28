import { shouldLoadBucketlists } from '../should-load-bucketlists';
import { TestScheduler } from 'rxjs/testing';
import { createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { tap } from 'rxjs';
import { BucketlistActions } from '../../actions';

const assertEqual = (a: unknown, b: unknown): void => {
  expect(a).toEqual(b);
};

describe('shouldLoadBucketlists', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler(assertEqual);
  });

  describe('given a routerNavigatedAction', () => {
    describe('with MY_BUCKETLISTS in urlAfterRedirects', () => {
      const ROUTER_NAVIGATED_ACTION = routerNavigatedAction({
        payload: {
          event: {
            urlAfterRedirects: '/my-bucketlists',
          },
        } as unknown as Parameters<typeof routerNavigatedAction>[0]['payload'],
      });

      it('should return true', () => {
        scheduler.run(({ expectObservable, cold }) => {
          const action$ = cold('--a--', {
            a: ROUTER_NAVIGATED_ACTION,
          });

          const effect = createEffect(() => {
            return action$.pipe(
              ofType(routerNavigatedAction),
              shouldLoadBucketlists(),
            );
          });

          expectObservable(effect).toBe('--a--', {
            a: ROUTER_NAVIGATED_ACTION,
          });
        });
      });
    });

    describe('with BITE in urlAfterRedirects', () => {
      describe('and without RESTAURANT in urlAfterRedirects', () => {
        const ROUTER_NAVIGATED_ACTION = routerNavigatedAction({
          payload: {
            event: {
              urlAfterRedirects: '/bite/123',
            },
          } as unknown as Parameters<
            typeof routerNavigatedAction
          >[0]['payload'],
        });

        it('should return true', () => {
          scheduler.run(({ expectObservable, cold }) => {
            const action$ = cold('--a--', {
              a: ROUTER_NAVIGATED_ACTION,
            });

            const effect = createEffect(() => {
              return action$.pipe(
                ofType(routerNavigatedAction),
                shouldLoadBucketlists(),
              );
            });

            expectObservable(effect).toBe('--a--', {
              a: ROUTER_NAVIGATED_ACTION,
            });
          });
        });
      });

      describe('and with RESTAURANT in urlAfterRedirects', () => {
        const ROUTER_NAVIGATED_ACTION = routerNavigatedAction({
          payload: {
            event: {
              urlAfterRedirects: '/bite/123/restaurant/456',
            },
          } as unknown as Parameters<
            typeof routerNavigatedAction
          >[0]['payload'],
        });

        it('should return false', () => {
          scheduler.run(({ expectObservable, cold }) => {
            const action$ = cold('--a--', {
              a: ROUTER_NAVIGATED_ACTION,
            });

            const effect = createEffect(() => {
              return action$.pipe(
                ofType(routerNavigatedAction),
                shouldLoadBucketlists(),
                tap(() => {
                  throw new Error('Should not emit');
                }),
              );
            });

            expectObservable(effect).toBe('----');
          });
        });
      });
    });
  });

  describe('given a removedBiteFromBucketlist', () => {
    const ACTION = BucketlistActions.removedBiteFromBucketlist();

    it('should return true', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: ACTION,
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(BucketlistActions.removedBiteFromBucketlist),
            shouldLoadBucketlists(),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: ACTION,
        });
      });
    });
  });

  describe('given a savedBiteToBucketlist', () => {
    const ACTION = BucketlistActions.savedBiteToBucketlist({
      bucketlist: {} as unknown as Parameters<
        typeof BucketlistActions.savedBiteToBucketlist
      >[0]['bucketlist'],
    });

    it('should return true', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: ACTION,
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(BucketlistActions.savedBiteToBucketlist),
            shouldLoadBucketlists(),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: ACTION,
        });
      });
    });
  });

  describe('given a createdBucketlistAndSavedBiteToIt', () => {
    const ACTION = BucketlistActions.createdBucketlistAndSavedBiteToIt();

    it('should return true', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: ACTION,
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(BucketlistActions.createdBucketlistAndSavedBiteToIt),
            shouldLoadBucketlists(),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: ACTION,
        });
      });
    });
  });

  describe('given a setBiteTriedOutStatusSucceeded', () => {
    const ACTION = BucketlistActions.setBiteTriedOutStatusSucceeded();

    it('should return true', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: ACTION,
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(BucketlistActions.setBiteTriedOutStatusSucceeded),
            shouldLoadBucketlists(),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: ACTION,
        });
      });
    });
  });

  describe('given a savedBiteTrailAsBucketList', () => {
    const ACTION = BucketlistActions.savedBiteTrailAsBucketList();

    it('should return true', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: ACTION,
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(BucketlistActions.savedBiteTrailAsBucketList),
            shouldLoadBucketlists(),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: ACTION,
        });
      });
    });
  });

  describe('given any other action', () => {
    const ACTION = { type: 'UNKNOWN_ACTION' };

    it('should return false', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: ACTION,
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType('UNKNOWN_ACTION'),
            shouldLoadBucketlists(),
            tap(() => {
              throw new Error('Should not emit');
            }),
          );
        });

        expectObservable(effect).toBe('----');
      });
    });
  });
});
