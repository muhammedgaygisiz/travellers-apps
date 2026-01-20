import { withUserFromAction } from './with-user-from-action';
import { TestScheduler } from 'rxjs/testing';
import { createEffect, ofType } from '@ngrx/effects';
import { map } from 'rxjs';
import { fromAuth } from 'ta-firestore';

const assertEqual = (a: any, b: any): void => {
  expect(a).toEqual(b);
};

const wrapInTestAction = (userUid: string): any => {
  return { type: 'TEST_ACTION', userUid };
};

describe('withUserFromAction', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler(assertEqual);
  });

  describe('given a observable with a user and id in it', () => {
    it('should return the user id', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: fromAuth.AuthActions.loadedUser({
            user: { uid: 'user-123' } as any,
          }),
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(fromAuth.AuthActions.loadedUser),
            withUserFromAction(),
            map((userUid) => wrapInTestAction(userUid)),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: wrapInTestAction('user-123'),
        });
      });
    });
  });

  describe('given an observable without user id', () => {
    it('should return an empty string', () => {
      scheduler.run(({ expectObservable, cold }) => {
        const action$ = cold('--a--', {
          a: fromAuth.AuthActions.loadedUser({ user: null }),
        });

        const effect = createEffect(() => {
          return action$.pipe(
            ofType(fromAuth.AuthActions.loadedUser),
            withUserFromAction(),
            map((userUid) => wrapInTestAction(userUid)),
          );
        });

        expectObservable(effect).toBe('--a--', {
          a: wrapInTestAction(''),
        });
      });
    });
  });
});
