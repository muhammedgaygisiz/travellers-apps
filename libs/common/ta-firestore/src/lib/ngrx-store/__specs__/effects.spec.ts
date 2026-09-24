import { AuthEffects } from '../effects';
import { TestScheduler } from 'rxjs/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { rootEffectsInit } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { AuthService } from '../../auth.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AuthActions } from '../actions';
import { Action } from '@ngrx/store';
import { NavController } from '@ionic/angular';
import { BiteTribeRole, isAuthEntryPage, REQUIRED_ROLES } from 'utils';
import { RequestedUrlService } from '../../requested-url.service';
import { AppCheckReadinessService } from '../../app-check-readiness.service';

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  isAuthEntryPage: jest.fn(() => true),
}));

jest.mock('@ionic/angular');

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  expect(actual).toEqual(expected);
};

const AuthServiceMock = {
  isLoggedIn$: of(true),
  initialize: jest.fn(),
  loginWithUsernameAndPassword: jest.fn(),
  logout: jest.fn(() => Promise.resolve()),
  registerWithUsernameAndPassword: jest.fn(() => Promise.resolve()),
  signInWithGoogleAccount: jest.fn(() => Promise.resolve()),
  signInWithAppleAccount: jest.fn(() => Promise.resolve()),
  authState: jest.fn(),
  setupAnalyticsAndCrashlytics: jest.fn(),
  hasAnyRole: jest.fn(() => Promise.resolve(true)),
  endRejectedSession: jest.fn(() => Promise.resolve()),
};

const MockNavController = {
  navigateBack: jest.fn(),
  navigateRoot: jest.fn(),
};

describe(AuthEffects.name, () => {
  let scheduler: TestScheduler;
  let effects: AuthEffects;
  let actions$: Observable<Action>;
  let store: MockStore;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default to an interactive sign-in; the startup-restore case sets its own.
    (isAuthEntryPage as jest.Mock).mockReturnValue(true);

    // Set default implementations
    AuthServiceMock.loginWithUsernameAndPassword.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.logout.mockResolvedValue(undefined);
    AuthServiceMock.registerWithUsernameAndPassword.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.signInWithGoogleAccount.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.signInWithAppleAccount.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.hasAnyRole.mockResolvedValue(true);
    AuthServiceMock.endRejectedSession.mockResolvedValue(undefined);

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

  it('should not initialize auth from the NgRx effect constructor', () => {
    expect(AuthServiceMock.initialize).not.toHaveBeenCalled();
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

    // Issue #1273: the login form is locked while this effect runs, so a second
    // submit must be dropped rather than raced, and a round-trip that never
    // settles must still release the form.
    describe('given a duplicate login action', () => {
      it('should only start one sign-in', () => {
        AuthServiceMock.loginWithUsernameAndPassword.mockReturnValue(
          new Promise(() => undefined),
        );

        scheduler.run(({ cold, expectObservable }) => {
          const authCreds = {
            email: 'q@q.de',
            password: 'password',
          };
          actions$ = cold('-a-a', { a: AuthActions.login({ authCreds }) });

          expectObservable(effects.loginEffect$);
        });

        expect(
          AuthServiceMock.loginWithUsernameAndPassword,
        ).toHaveBeenCalledTimes(1);
      });
    });

    describe('given a sign-in that never settles', () => {
      it('should dispatch loginFailed once the timeout elapses', () => {
        AuthServiceMock.loginWithUsernameAndPassword.mockReturnValue(
          new Promise(() => undefined),
        );

        scheduler.run(({ cold, expectObservable }) => {
          const authCreds = {
            email: 'q@q.de',
            password: 'password',
          };
          actions$ = cold('-a', { a: AuthActions.login({ authCreds }) });

          expectObservable(effects.loginEffect$).toBe('30001ms b', {
            b: AuthActions.loginFailed(),
          });
        });
      });
    });

    describe('given an error is thrown', () => {
      it('should dispatch loginFailed action', () => {
        AuthServiceMock.loginWithUsernameAndPassword.mockRejectedValue(
          new Error('Login error'),
        );

        scheduler.run(async ({ cold, expectObservable }) => {
          const authCreds = {
            email: 'q@q.de',
            password: 'password',
          };
          actions$ = cold('-a', { a: AuthActions.login({ authCreds }) });

          const expected = cold('-b', { b: AuthActions.loginFailed() });

          await firstValueFrom(effects.loginEffect$);
          expectObservable(effects.loginEffect$).toEqual(expected);
        });
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

    describe('given an error occurs', () => {
      it('should dispatch logoutFailed action', () => {
        AuthServiceMock.logout.mockRejectedValue(new Error('Logout error'));

        scheduler.run(async ({ cold, expectObservable }) => {
          actions$ = cold('-a', { a: AuthActions.logout() });

          const expected = cold('-b', { b: AuthActions.logoutFailed() });

          await firstValueFrom(effects.logoutEffect$);
          expectObservable(effects.logoutEffect$).toEqual(expected);
        });
      });
    });
  });

  describe('loginWithGoogleAccountEffect$', () => {
    describe('given a loginWithGoogleAccount action', () => {
      it('should call signInWithGoogleAccount$', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', {
            a: AuthActions.loginWithGoogleAccount(),
          });

          expectObservable(effects.loginWithGoogleAccountEffect$);
        });

        expect(AuthServiceMock.signInWithGoogleAccount).toHaveBeenCalled();
      });
    });

    describe('given an error occurs', () => {
      it('should dispatch loginFailed action', () => {
        AuthServiceMock.signInWithGoogleAccount.mockRejectedValue(
          new Error('Google login error'),
        );

        scheduler.run(async ({ cold, expectObservable }) => {
          actions$ = cold('-a', {
            a: AuthActions.loginWithGoogleAccount(),
          });

          const expected = cold('-b', { b: AuthActions.loginFailed() });

          await firstValueFrom(effects.loginWithGoogleAccountEffect$);
          expectObservable(effects.loginWithGoogleAccountEffect$).toEqual(
            expected as unknown as Parameters<
              ReturnType<typeof expectObservable>['toEqual']
            >[0],
          );
        });
      });
    });
  });

  describe('loginWithAppleAccountEffect$', () => {
    describe('given a loginWithAppleAccount action', () => {
      it('should call signInWithAppleAccount$', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('-a', {
            a: AuthActions.loginWithAppleAccount(),
          });

          expectObservable(effects.loginWithAppleAccountEffect$);
        });

        expect(AuthServiceMock.signInWithAppleAccount).toHaveBeenCalled();
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
            b: AuthActions.loadedUser({
              user: { uid: '123' } as unknown as Parameters<
                typeof AuthActions.loadedUser
              >[0]['user'],
            }),
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
      describe('and the visitor is already inside the app', () => {
        beforeEach(() => {
          (isAuthEntryPage as jest.Mock).mockReturnValue(false);
        });

        it('should leave them on the page they opened', () => {
          (
            effects as unknown as {
              pageAfterLogin?: string;
              pageAfterLogout?: string;
            }
          ).pageAfterLogin = '/home';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

            expectObservable(effects.successFulLogin$);
          });

          expect(MockNavController.navigateRoot).not.toHaveBeenCalled();
          expect(MockNavController.navigateBack).not.toHaveBeenCalled();
        });
      });

      describe('and a requested URL was remembered before signing in', () => {
        it('should return the visitor to it', () => {
          TestBed.inject(RequestedUrlService).remember('/bite/shared-123');
          (effects as unknown as { pageAfterLogin?: string }).pageAfterLogin =
            '/home';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

            expectObservable(effects.successFulLogin$);
          });

          expect(MockNavController.navigateRoot).toHaveBeenCalledWith(
            '/bite/shared-123',
          );
          expect(MockNavController.navigateBack).not.toHaveBeenCalled();
        });

        it('should keep it when the same sign-in is reported twice', () => {
          // The login effect and the startup session check both report one
          // sign-in; a second routing would land on the default page.
          TestBed.inject(RequestedUrlService).remember('/bite/shared-123');
          (effects as unknown as { pageAfterLogin?: string }).pageAfterLogin =
            '/home';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-ab', {
              a: AuthActions.loginSucceeded(),
              b: AuthActions.loginSucceeded(),
            });

            expectObservable(effects.successFulLogin$);
          });

          expect(MockNavController.navigateRoot).toHaveBeenCalledTimes(1);
          expect(MockNavController.navigateRoot).toHaveBeenCalledWith(
            '/bite/shared-123',
          );
          expect(MockNavController.navigateBack).not.toHaveBeenCalled();
        });
      });

      describe('and pageAfterLogin is defined', () => {
        it('should navigate to pageAfterLogin', () => {
          (
            effects as unknown as {
              pageAfterLogin?: string;
              pageAfterLogout?: string;
            }
          ).pageAfterLogin = '/custom-login-page';

          scheduler.run(({ cold, expectObservable }) => {
            actions$ = cold('-a', { a: AuthActions.loginSucceeded() });

            expectObservable(effects.successFulLogin$);
          });

          expect(MockNavController.navigateBack).toHaveBeenCalledWith([
            '/custom-login-page',
          ]);
        });
      });

      describe('and neither a requested URL nor a pageAfterLogin exists', () => {
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
          (
            effects as unknown as {
              pageAfterLogin?: string;
              pageAfterLogout?: string;
            }
          ).pageAfterLogout = '/custom-logout-page';

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

/**
 * A sign-in refused for a missing or invalid App Check token is not a rejected
 * sign-in, and is not reported as one (issue #1621).
 *
 * Identity Toolkit answers `401 UNAUTHENTICATED` before it looks at the
 * credentials when Console enforcement is on and the request carries no usable
 * token. The account is fine, the password is fine, and every later attempt on
 * this page fails the same way until a token comes back - so the readiness
 * service takes it, and the form is released without a rejection message.
 */
describe(`${AuthEffects.name} with App Check refusing the request`, () => {
  let effects: AuthEffects;
  let actions$: Observable<Action>;
  let readiness: AppCheckReadinessService;

  const authCreds = { email: 'q@q.de', password: 'password' };

  /** What Identity Toolkit answers a request carrying no usable token. */
  const appCheckRefusal = (): Error =>
    Object.assign(new Error('Firebase App Check token is invalid.'), {
      code: 'auth/internal-error',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (isAuthEntryPage as jest.Mock).mockReturnValue(true);
    AuthServiceMock.hasAnyRole.mockResolvedValue(true);

    TestBed.resetTestingModule();
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
    readiness = TestBed.inject(AppCheckReadinessService);
    jest.spyOn(readiness, 'reportTokenLost').mockResolvedValue();
  });

  it('should route an email sign-in into the readiness path', async () => {
    AuthServiceMock.loginWithUsernameAndPassword.mockRejectedValue(
      appCheckRefusal(),
    );
    actions$ = of(AuthActions.login({ authCreds }));

    const result = await firstValueFrom(effects.loginEffect$);

    expect(result).toEqual(AuthActions.loginBlockedByAppCheck());
    expect(readiness.reportTokenLost).toHaveBeenCalled();
  });

  it('should route a Google sign-in into the readiness path', async () => {
    AuthServiceMock.signInWithGoogleAccount.mockRejectedValue(
      appCheckRefusal(),
    );
    actions$ = of(AuthActions.loginWithGoogleAccount());

    const result = await firstValueFrom(effects.loginWithGoogleAccountEffect$);

    expect(result).toEqual(AuthActions.loginBlockedByAppCheck());
    expect(readiness.reportTokenLost).toHaveBeenCalled();
  });

  it('should route an Apple sign-in into the readiness path', async () => {
    AuthServiceMock.signInWithAppleAccount.mockRejectedValue(appCheckRefusal());
    actions$ = of(AuthActions.loginWithAppleAccount());

    const result = await firstValueFrom(effects.loginWithAppleAccountEffect$);

    expect(result).toEqual(AuthActions.loginBlockedByAppCheck());
    expect(readiness.reportTokenLost).toHaveBeenCalled();
  });

  it('should leave a genuinely rejected sign-in alone', async () => {
    AuthServiceMock.loginWithUsernameAndPassword.mockRejectedValue(
      Object.assign(new Error('The password is invalid.'), {
        code: 'auth/wrong-password',
      }),
    );
    actions$ = of(AuthActions.login({ authCreds }));

    const result = await firstValueFrom(effects.loginEffect$);

    expect(result).toEqual(AuthActions.loginFailed());
    expect(readiness.reportTokenLost).not.toHaveBeenCalled();
  });
});

/**
 * A provider sign-in that fails says so; one the user dismissed does not
 * (issue #1622).
 *
 * Both used to dispatch `registrationFailed`, which releases the form and sets
 * nothing the login page renders - so a Google sign-in Firebase refused left
 * the page looking exactly as it did before the tap.
 */
describe.each([
  {
    provider: 'Google',
    signIn: AuthServiceMock.signInWithGoogleAccount,
    action: AuthActions.loginWithGoogleAccount(),
    effect: (effects: AuthEffects): Observable<Action> =>
      effects.loginWithGoogleAccountEffect$,
  },
  {
    provider: 'Apple',
    signIn: AuthServiceMock.signInWithAppleAccount,
    action: AuthActions.loginWithAppleAccount(),
    effect: (effects: AuthEffects): Observable<Action> =>
      effects.loginWithAppleAccountEffect$,
  },
])(
  `${AuthEffects.name} when a $provider sign-in does not succeed`,
  ({ signIn, action, effect }) => {
    let effects: AuthEffects;
    let actions$: Observable<Action>;
    let warn: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      (isAuthEntryPage as jest.Mock).mockReturnValue(true);

      TestBed.resetTestingModule();
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
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const run = (error: unknown): Promise<Action> => {
      signIn.mockRejectedValue(error);
      actions$ = of(action);

      return firstValueFrom(effect(effects));
    };

    it.each([
      ['a backend rejection', { code: 'auth/internal-error', message: 'boom' }],
      ['a disabled account', { code: 'auth/user-disabled' }],
      ['an error with no code at all', new Error('network request failed')],
    ])('should report %s as a login failure', async (_, error) => {
      expect(await run(error)).toEqual(AuthActions.loginFailed());
      expect(MockNavController.navigateBack).not.toHaveBeenCalled();
    });

    it('should log the rejection with its Firebase code', async () => {
      const error = { code: 'auth/user-disabled' };

      await run(error);

      expect(warn).toHaveBeenCalledWith(
        'Provider sign-in failed:',
        'auth/user-disabled',
        error,
      );
    });

    it.each([
      ['the web popup closed', { code: 'auth/popup-closed-by-user' }],
      [
        'a second popup replacing the first',
        { code: 'auth/cancelled-popup-request' },
      ],
      ['the user cancelling', { code: 'auth/user-cancelled' }],
      [
        'the native sheet dismissed',
        { message: 'The user canceled the sign-in flow.' },
      ],
    ])('should unlock the form without a failure when %s', async (_, error) => {
      expect(await run(error)).toEqual(AuthActions.loginCancelled());
      expect(warn).not.toHaveBeenCalled();
    });
  },
);

/**
 * Sign-in refuses an account that lacks the role the app requires, and reports
 * the refusal as the same generic failure a wrong password produces.
 *
 * The point of these tests is what is *not* observable: no `loginSucceeded`, no
 * navigation, and nothing that distinguishes "wrong password" from "right
 * password, wrong account" (issue #1469).
 */
describe(`${AuthEffects.name} with a required role`, () => {
  let scheduler: TestScheduler;
  let effects: AuthEffects;
  let actions$: Observable<Action>;

  const authCreds = { email: 'q@q.de', password: 'password' };

  const configure = (requiredRoles: BiteTribeRole[] | null): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: AuthService, useValue: AuthServiceMock },
        provideMockStore(),
        { provide: NavController, useValue: MockNavController },
        ...(requiredRoles
          ? [{ provide: REQUIRED_ROLES, useValue: requiredRoles }]
          : []),
      ],
    });
    effects = TestBed.inject(AuthEffects);
  };

  const emitted = async (
    effect$: Observable<Action>,
    action: Action,
  ): Promise<Action> => {
    actions$ = of(action);
    return firstValueFrom(effect$);
  };

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    jest.clearAllMocks();
    (isAuthEntryPage as jest.Mock).mockReturnValue(true);
    AuthServiceMock.loginWithUsernameAndPassword.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.signInWithGoogleAccount.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.signInWithAppleAccount.mockResolvedValue({
      user: { uid: '123' },
    });
    AuthServiceMock.endRejectedSession.mockResolvedValue(undefined);
  });

  it('is unused by an app that binds no role', async () => {
    configure(null);
    AuthServiceMock.hasAnyRole.mockResolvedValue(false);

    const result = await emitted(
      effects.loginEffect$,
      AuthActions.login({ authCreds }),
    );

    expect(result).toEqual(AuthActions.loginSucceeded());
    expect(AuthServiceMock.hasAnyRole).not.toHaveBeenCalled();
  });

  // An unbound token and a bound-but-empty list both mean "no role required".
  // The consumer app relies on the first; the second is what a shell would
  // produce if it built the list from configuration and got nothing.
  it('is unused by an app that binds an empty role list', async () => {
    configure([]);
    AuthServiceMock.hasAnyRole.mockResolvedValue(false);

    const result = await emitted(
      effects.loginEffect$,
      AuthActions.login({ authCreds }),
    );

    expect(result).toEqual(AuthActions.loginSucceeded());
    expect(AuthServiceMock.hasAnyRole).not.toHaveBeenCalled();
  });

  it('signs in an account that holds the required role', async () => {
    configure(['business']);
    AuthServiceMock.hasAnyRole.mockResolvedValue(true);

    const result = await emitted(
      effects.loginEffect$,
      AuthActions.login({ authCreds }),
    );

    expect(result).toEqual(AuthActions.loginSucceeded());
    expect(AuthServiceMock.endRejectedSession).not.toHaveBeenCalled();
  });

  describe('given credentials that are right but an account without the role', () => {
    beforeEach(() => {
      configure(['business']);
      AuthServiceMock.hasAnyRole.mockResolvedValue(false);
    });

    it('fails the login instead of succeeding it', async () => {
      const result = await emitted(
        effects.loginEffect$,
        AuthActions.login({ authCreds }),
      );

      expect(result).toEqual(AuthActions.loginFailed());
    });

    it('ends the session, so nothing is left to deep-link with', async () => {
      await emitted(effects.loginEffect$, AuthActions.login({ authCreds }));

      expect(AuthServiceMock.endRejectedSession).toHaveBeenCalled();
    });

    // The wrong-password path emits exactly this. An observer must not be able
    // to tell the two apart.
    it('is indistinguishable from a wrong password', async () => {
      const rejectedByRole = await emitted(
        effects.loginEffect$,
        AuthActions.login({ authCreds }),
      );

      AuthServiceMock.hasAnyRole.mockResolvedValue(true);
      AuthServiceMock.loginWithUsernameAndPassword.mockRejectedValue(
        new Error('auth/wrong-password'),
      );
      const rejectedByPassword = await emitted(
        effects.loginEffect$,
        AuthActions.login({ authCreds }),
      );

      expect(rejectedByRole).toEqual(rejectedByPassword);
    });

    it('retries once against a freshly minted token before rejecting', async () => {
      AuthServiceMock.hasAnyRole
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await emitted(
        effects.loginEffect$,
        AuthActions.login({ authCreds }),
      );

      expect(result).toEqual(AuthActions.loginSucceeded());
      expect(AuthServiceMock.hasAnyRole).toHaveBeenNthCalledWith(
        2,
        ['business'],
        true,
      );
    });

    // The gap #1075 caught in the emulator: the route guard admitted a staff
    // account that this gate had already turned away, so a staff account could
    // not sign into the business app at all.
    it('admits an account holding the second of two roles', async () => {
      configure(['business', 'staff']);
      AuthServiceMock.hasAnyRole.mockImplementation(
        async (roles: BiteTribeRole[]) => roles.includes('staff'),
      );

      const result = await emitted(
        effects.loginEffect$,
        AuthActions.login({ authCreds }),
      );

      expect(result).toEqual(AuthActions.loginSucceeded());
      expect(AuthServiceMock.endRejectedSession).not.toHaveBeenCalled();
    });

    it('passes every admitted role to the check', async () => {
      configure(['business', 'staff']);
      AuthServiceMock.hasAnyRole.mockResolvedValue(true);

      await emitted(effects.loginEffect$, AuthActions.login({ authCreds }));

      expect(AuthServiceMock.hasAnyRole).toHaveBeenCalledWith([
        'business',
        'staff',
      ]);
    });

    it('rejects a Google sign-in the same way, not as a registration failure', async () => {
      const result = await emitted(
        effects.loginWithGoogleAccountEffect$,
        AuthActions.loginWithGoogleAccount(),
      );

      expect(result).toEqual(AuthActions.loginFailed());
      expect(MockNavController.navigateBack).not.toHaveBeenCalled();
    });

    it('rejects an Apple sign-in the same way', async () => {
      const result = await emitted(
        effects.loginWithAppleAccountEffect$,
        AuthActions.loginWithAppleAccount(),
      );

      expect(result).toEqual(AuthActions.loginFailed());
    });

    it('still lets a dismissed popup pass silently', async () => {
      AuthServiceMock.signInWithGoogleAccount.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      });

      const result = await emitted(
        effects.loginWithGoogleAccountEffect$,
        AuthActions.loginWithGoogleAccount(),
      );

      expect(result).toEqual(AuthActions.loginCancelled());
    });
  });

  afterAll(() => {
    scheduler.flush();
  });
});
