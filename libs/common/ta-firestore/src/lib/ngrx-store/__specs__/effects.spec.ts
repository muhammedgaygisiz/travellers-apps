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
import { isBiteDetailsPage } from 'utils';

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  isBiteDetailsPage: jest.fn(() => false),
}));

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
    beforeEach(() => {
      jest.clearAllMocks();
    });

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
            b: AuthActions.loadedUser({ user: { uid: '123' } as any }),
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
      describe('and it is a bite detail page', () => {
        beforeEach(() => {
          (isBiteDetailsPage as jest.Mock).mockReturnValue(true);
        });

        it('should do nothing', () => {
          (effects as any).pageAfterLogin = '/bites/123';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

            expectObservable(effects.successFulLogin$);
          });

          expect(MockNavController.navigateRoot).not.toHaveBeenCalled();
        });
      });

      describe('and pageAfterLogin is defined', () => {
        beforeEach(() => {
          (isBiteDetailsPage as jest.Mock).mockReturnValue(false);
        });

        it('should navigate to pageAfterLogin', () => {
          (effects as any).pageAfterLogin = '/custom-login-page';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

            expectObservable(effects.successFulLogin$);
          });

          expect(MockNavController.navigateBack).toHaveBeenCalledWith([
            '/custom-login-page',
          ]);
        });
      });

      describe('and it is not a bite page or the pageAfterLogin', () => {
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

  describe('successFulLogout$', () => {
    describe('given a logoutSucceeded action', () => {
      describe('and no pageAfterLogout is defined', () => {
        it('should navigate to login page', () => {
          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.logoutSucceeded() });

            expectObservable(effects.successFulLogout$);
          });

          expect(MockNavController.navigateRoot).toHaveBeenCalledWith([
            '/login',
          ]);
        });
      });

      describe('and pageAfterLogout is defined', () => {
        it('should navigate to pageAfterLogout', () => {
          (effects as any).pageAfterLogout = '/custom-logout-page';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.logoutSucceeded() });

            expectObservable(effects.successFulLogout$);
          });

          expect(MockNavController.navigateRoot).toHaveBeenCalledWith([
            '/custom-logout-page',
          ]);
        });
      });
    });
  });
});
