import { AuthEffects } from '../effects';
import { TestScheduler } from 'rxjs/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { rootEffectsInit } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { AuthService } from '../../auth.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AuthActions } from '../actions';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const AuthServiceMock = {
  isLoggedIn$: of(true),
  initialize: jest.fn(),
  loginWithUsernameAndPassword$: (): any => of({} as any),
  logout: jest.fn(() => Promise.resolve()),
};

describe(AuthEffects.name, () => {
  let scheduler: TestScheduler;
  let effects: AuthEffects;
  let actions$: Observable<any>;
  let store: MockStore;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: AuthService, useValue: AuthServiceMock },
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AuthEffects);
    store = TestBed.inject(MockStore);
    dispatchSpy = jest.spyOn(store, 'dispatch');
  });

  describe('checkAuthStatus$', () => {
    describe('given a ROOT_EFFECTS_INIT', () => {
      it('should dispatch loginSucceeded if isLoggedIn$ emits true', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: rootEffectsInit() });

          expectObservable(effects.checkAuthStatus$);
        });

        expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.loginSucceeded());
      });
    });
  });

  describe('loginEffect$', () => {
    describe('given a login action', () => {
      it('should call login$ with authCreds', () => {
        scheduler.run(({ cold, expectObservable }) => {
          const authCreds = {
            email: 'q@q.de',
            password: 'password',
          };
          actions$ = cold('-a', { a: AuthActions.login({ authCreds }) });

          expectObservable(effects.loginEffect$).toBe('-a', {
            a: AuthActions.loginSucceeded(),
          });
        });
      });
    });
  });
});
