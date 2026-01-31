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
  authState: jest.fn(),
  setupAnalyticsAndCrashlytics: jest.fn(),
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

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default implementations
    AuthServiceMock.loginWithUsernameAndPassword.mockResolvedValue({
      user: { uid: '123' },
    } as any);
    AuthServiceMock.logout.mockResolvedValue(undefined);
    AuthServiceMock.registerWithUsernameAndPassword.mockResolvedValue({
      user: { uid: '123' },
    } as any);
    AuthServiceMock.registerWithGoogleAccount.mockResolvedValue({
      user: { uid: '123' },
    } as any);
    AuthServiceMock.registerWithAppleAccount.mockResolvedValue({
      user: { uid: '123' },
    } as any);

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

  describe('loadUser$', () => {
    describe('given a loginSucceeded action with a user', () => {
      beforeEach(() => {
        AuthServiceMock.authState.mockReturnValue({
          user: { uid: '123' },
        });
      });

      it('should dispatch loadedUser action with user', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          const expected = cold('-b', {
            b: AuthActions.loadedUser({ user: { uid: '123' } }),
          });

          expectObservable(effects.loadUser$).toEqual(expected);
        });
      });

      it('should call setupAnalyticsAndCrashlytics when user exists', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          expectObservable(effects.loadUser$);
        });

        expect(
          AuthServiceMock.setupAnalyticsAndCrashlytics,
        ).toHaveBeenCalledWith({ uid: '123' });
      });
    });

    describe('given a loginSucceeded action without a user', () => {
      beforeEach(() => {
        AuthServiceMock.authState.mockReturnValue({ user: null });
      });

      it('should dispatch loadedUser action with null user', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          const expected = cold('-b', {
            b: AuthActions.loadedUser({ user: null }),
          });

          expectObservable(effects.loadUser$).toEqual(expected);
        });
      });

      it('should not call setupAnalyticsAndCrashlytics when user is null', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          expectObservable(effects.loadUser$);
        });

        expect(
          AuthServiceMock.setupAnalyticsAndCrashlytics,
        ).not.toHaveBeenCalled();
      });
    });

    describe('given a loginSucceeded action with undefined authState', () => {
      beforeEach(() => {
        AuthServiceMock.authState.mockReturnValue(undefined);
      });

      it('should dispatch loadedUser action with undefined user', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          const expected = cold('-b', {
            b: AuthActions.loadedUser({ user: undefined }),
          });

          expectObservable(effects.loadUser$).toEqual(expected);
        });
      });

      it('should not call setupAnalyticsAndCrashlytics when user is undefined', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

          expectObservable(effects.loadUser$);
        });

        expect(
          AuthServiceMock.setupAnalyticsAndCrashlytics,
        ).not.toHaveBeenCalled();
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

  describe('successFulLogout$', () => {
    describe('given a logoutSucceeded action', () => {
      it('should navigate to login page', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.logoutSucceeded() });

          expectObservable(effects.successFulLogout$);
        });

        expect(MockNavController.navigateRoot).toHaveBeenCalledWith(['/login']);
      });
    });
  });
});
