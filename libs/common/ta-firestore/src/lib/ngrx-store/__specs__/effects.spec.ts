import { AuthEffects } from '../effects';
import { TestScheduler } from 'rxjs/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { rootEffectsInit } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { AuthService } from '../../auth.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AuthActions } from '../actions';
import { NavController } from '@ionic/angular';

jest.mock('@ionic/angular');

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const AuthServiceMock = {
  isLoggedIn$: of(true),
  initialize: jest.fn(),
  loginWithUsernameAndPassword: jest.fn(),
  logout: jest.fn(() => Promise.resolve()),
  registerWithUsernameAndPassword: jest.fn(() => Promise.resolve()),
  registerWithGoogleAccount: jest.fn(() => Promise.resolve()),
  registerWithAppleAccount: jest.fn(() => Promise.resolve()),
};

const MockNavController = {
  navigateBack: jest.fn(),
  navigateRoot: jest.fn(),
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
        { provide: NavController, useValue: MockNavController },
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

          expectObservable(effects.loginEffect$);
        });

        expect(
          AuthServiceMock.loginWithUsernameAndPassword,
        ).toHaveBeenCalledWith({ email: 'q@q.de', password: 'password' });
      });
    });
  });

  describe('logoutEffect$', () => {
    describe('given a logout action', () => {
      it('should call authService.logout', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.logout() });

          expectObservable(effects.logoutEffect$);
        });

        expect(AuthServiceMock.logout).toHaveBeenCalled();
      });
    });
  });

  describe('registrationEffect$', () => {
    describe('given a registerWithEmail action', () => {
      it('should call registerWithUsernameAndPassword$ with registration', () => {
        scheduler.run(({ cold, expectObservable }) => {
          const registration = {
            email: 'q@q.de',
            password: 'password',
          };
          actions$ = cold('-a', {
            a: AuthActions.registerWithEmail({ registration }),
          });

          expectObservable(effects.registrationEffect$);
        });

        expect(
          AuthServiceMock.registerWithUsernameAndPassword,
        ).toHaveBeenCalledWith({
          email: 'q@q.de',
          password: 'password',
        });
      });
    });
  });

  describe('loginWithGoogleAccountEffect$', () => {
    describe('given a loginWithGoogleAccount action', () => {
      it('should call registerWithGoogleAccount$', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', {
            a: AuthActions.loginWithGoogleAccount(),
          });

          expectObservable(effects.loginWithGoogleAccountEffect$);
        });

        expect(AuthServiceMock.registerWithGoogleAccount).toHaveBeenCalled();
      });
    });
  });

  describe('loginWithAppleAccountEffect$', () => {
    describe('given a loginWithAppleAccount action', () => {
      it('should call registerWithAppleAccount$', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', {
            a: AuthActions.loginWithAppleAccount(),
          });

          expectObservable(effects.loginWithAppleAccountEffect$);
        });

        expect(AuthServiceMock.registerWithAppleAccount).toHaveBeenCalled();
      });
    });
  });

  describe('successFulLogin$', () => {
    describe('given a loginSucceeded action', () => {
      it('should navigate back to root', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          expectObservable(effects.successFulLogin$);
        });

        expect(MockNavController.navigateRoot).toHaveBeenCalledWith(['/']);
      });
    });
  });
});
