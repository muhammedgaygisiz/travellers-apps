import { TestScheduler } from 'rxjs/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { createEffect, ofType } from '@ngrx/effects';
import { isProfilePage } from '../is-profile-page';

const assertEqual = (a: unknown, b: unknown): void => {
  expect(a).toEqual(b);
};

describe('isProfilePage', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler(assertEqual);
  });

  describe('given an routerNavigatedAction', () => {
    describe('with profile in path', () => {
      it('should return source event', () => {
        scheduler.run(({ expectObservable, cold }) => {
          const sourceEvent = routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/profile/123' } },
          } as unknown as Parameters<typeof routerNavigatedAction>[0]);
          const action$ = cold('a', {
            a: sourceEvent,
          });

          const effect$ = createEffect(() => {
            return action$.pipe(ofType(routerNavigatedAction), isProfilePage());
          });

          expectObservable(effect$).toBe('a', {
            a: sourceEvent,
          });
        });
      });
    });

    describe('with my-profile in path', () => {
      it('should return source event', () => {
        scheduler.run(({ expectObservable, cold }) => {
          const sourceEvent = routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/my-profile' } },
          } as unknown as Parameters<typeof routerNavigatedAction>[0]);
          const action$ = cold('a', {
            a: sourceEvent,
          });

          const effect$ = createEffect(() => {
            return action$.pipe(ofType(routerNavigatedAction), isProfilePage());
          });

          expectObservable(effect$).toBe('a', {
            a: sourceEvent,
          });
        });
      });
    });

    describe('without profile in path', () => {
      it('should not return any event', () => {
        scheduler.run(({ expectObservable, cold }) => {
          const sourceEvent = routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/home' } },
          } as unknown as Parameters<typeof routerNavigatedAction>[0]);
          const action$ = cold('a', {
            a: sourceEvent,
          });

          const effect$ = createEffect(() => {
            return action$.pipe(ofType(routerNavigatedAction), isProfilePage());
          });

          expectObservable(effect$).toBe('');
        });
      });
    });

    describe('given another action', () => {
      it('should return the source event', () => {
        scheduler.run(({ expectObservable, cold }) => {
          const sourceEvent = { type: 'SOME_OTHER_ACTION' };
          const action$ = cold('a', {
            a: sourceEvent,
          });

          const effect$ = createEffect(() => {
            return action$.pipe(isProfilePage());
          });

          expectObservable(effect$).toBe('a', {
            a: sourceEvent,
          });
        });
      });
    });
  });
});
