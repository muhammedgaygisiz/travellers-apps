import { AUTH_RESTORE_TIMEOUT_MS, AuthService } from '../auth.service';
import { TestBed } from '@angular/core/testing';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from '../provide-firestore-utils';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import * as firestoreUtils from 'firebase/firestore';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';
import { TestScheduler } from 'rxjs/testing';
import { tap } from 'rxjs';
import { NavController } from '@ionic/angular';

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
  },
  registerPlugin: jest.fn(() => ({})),
  WebPlugin: class {},
}));

jest.mock('@capacitor-firebase/authentication');

jest.mock('@capacitor-firebase/analytics');

jest.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    setUserId: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/firestore');

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

jest.mock('firebase/firestore');

jest.mock('firebase/auth');

type SetupUserArg = Parameters<AuthService['setupAnalyticsAndCrashlytics']>[0];

const assertEqual = (a: unknown, b: unknown): void => {
  expect(a).toEqual(b);
};

describe(AuthService.name, () => {
  let service: AuthService;
  let scheduler: TestScheduler;
  let navigateRootMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new TestScheduler(assertEqual);
    navigateRootMock = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: FIREBASE_AUTH, useValue: { signOut: jest.fn() } },
        { provide: FIREBASE_FIRESTORE, useValue: {} },
        {
          provide: NavController,
          useValue: { navigateRoot: navigateRootMock },
        },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUser', () => {
    describe('given a user', () => {
      beforeEach(() => {
        jest
          .spyOn(service, 'authState')
          .mockReturnValue({ user: { uid: '123' } } as unknown as ReturnType<
            typeof service.authState
          >);
      });

      it('should return the user', async () => {
        const user = service.getUser();
        expect(user).toEqual({ uid: '123' });
      });
    });

    describe('given no user', () => {
      beforeEach(() => {
        jest
          .spyOn(service, 'authState')
          .mockReturnValue({ user: null } as unknown as ReturnType<
            typeof service.authState
          >);
      });

      it('should return null', async () => {
        const user = service.getUser();
        expect(user).toBeNull();
      });
    });

    describe('given no auth state', () => {
      it('should return undefined', () => {
        jest.spyOn(service, 'authState').mockReturnValue(undefined);

        expect(service.getUser()).toBeUndefined();
      });
    });
  });

  /**
   * The distinction issue #1101 introduced. A guest at a table signs in
   * anonymously so their table session has an identity to belong to, so
   * "somebody is signed in" and "a member is signed in" stopped being one
   * question - and the route guards ask the second one.
   */
  describe('getMember', () => {
    const signedInAs = (user: unknown): void => {
      jest
        .spyOn(service, 'authState')
        .mockReturnValue({ user } as unknown as ReturnType<
          typeof service.authState
        >);
    };

    it('returns a member who signed in with an account', () => {
      signedInAs({ uid: '123', isAnonymous: false });

      expect(service.getMember()).toEqual({ uid: '123', isAnonymous: false });
    });

    it('answers null for a guest holding an anonymous session', () => {
      signedInAs({ uid: 'guest', isAnonymous: true });

      expect(service.getMember()).toBeNull();
      expect(service.getUser()).toEqual({ uid: 'guest', isAnonymous: true });
    });

    it('answers null when nobody is signed in', () => {
      signedInAs(null);

      expect(service.getMember()).toBeNull();
    });
  });

  describe('signInAsGuest', () => {
    beforeEach(() => {
      (
        FirebaseAuthentication as unknown as { signInAnonymously: jest.Mock }
      ).signInAnonymously = jest
        .fn()
        .mockResolvedValue({ user: { uid: 'guest', isAnonymous: true } });
    });

    it('signs in anonymously when nobody is signed in', async () => {
      jest.spyOn(service, 'authState').mockReturnValue(undefined);

      await expect(service.signInAsGuest()).resolves.toEqual({
        uid: 'guest',
        isAnonymous: true,
      });
      expect(FirebaseAuthentication.signInAnonymously).toHaveBeenCalled();
    });

    /**
     * A member who scans a code at a table orders as themselves, and a guest
     * who scans a second table keeps the uid their first session belongs to.
     * Signing in again would mint a new uid and orphan both.
     */
    it('keeps an existing session rather than minting a second identity', async () => {
      jest
        .spyOn(service, 'authState')
        .mockReturnValue({ user: { uid: 'member' } } as unknown as ReturnType<
          typeof service.authState
        >);

      await expect(service.signInAsGuest()).resolves.toEqual({ uid: 'member' });
      expect(FirebaseAuthentication.signInAnonymously).not.toHaveBeenCalled();
    });
  });

  describe('refreshSession', () => {
    let getIdTokenMock: jest.Mock;

    beforeEach(() => {
      getIdTokenMock = jest.fn();
      (
        FirebaseAuthentication as unknown as { getIdToken: jest.Mock }
      ).getIdToken = getIdTokenMock;
    });

    it('returns true when the ID token refreshes successfully', async () => {
      getIdTokenMock.mockResolvedValue({ token: 'fresh-token' });

      await expect(service.refreshSession()).resolves.toBe(true);
      expect(getIdTokenMock).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('returns false when the token refresh fails', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      getIdTokenMock.mockRejectedValue(new Error('no current user'));

      await expect(service.refreshSession()).resolves.toBe(false);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getRoles, hasRole and hasAnyRole', () => {
    let getIdTokenResultMock: jest.Mock;

    const signedIn = (): void => {
      jest
        .spyOn(service, 'authState')
        .mockReturnValue({ user: { uid: '123' } } as unknown as ReturnType<
          typeof service.authState
        >);
    };

    const tokenCarrying = (roles: unknown): void => {
      getIdTokenResultMock.mockResolvedValue({ claims: { roles } });
    };

    beforeEach(() => {
      getIdTokenResultMock = jest.fn();
      (
        FirebaseAuthentication as unknown as { getIdTokenResult: jest.Mock }
      ).getIdTokenResult = getIdTokenResultMock;
      signedIn();
      tokenCarrying(['business']);
    });

    it('reads the roles off the ID token', async () => {
      tokenCarrying(['admin', 'staff']);

      await expect(service.getRoles()).resolves.toEqual(['admin', 'staff']);
    });

    it('answers no roles when nobody is signed in, without reading a token', async () => {
      jest
        .spyOn(service, 'authState')
        .mockReturnValue({ user: null } as unknown as ReturnType<
          typeof service.authState
        >);

      await expect(service.getRoles()).resolves.toEqual([]);
      expect(getIdTokenResultMock).not.toHaveBeenCalled();
    });

    // A token read that throws inside a route guard surfaces as a navigation
    // error and a blank page, so it is reported as "no roles" instead.
    it('answers no roles rather than throwing when the token cannot be read', async () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      getIdTokenResultMock.mockRejectedValue(new Error('no current user'));

      await expect(service.getRoles()).resolves.toEqual([]);

      warn.mockRestore();
    });

    it('drops a claim value that is not a role', async () => {
      tokenCarrying(['business', 'owner', 7]);

      await expect(service.getRoles()).resolves.toEqual(['business']);
    });

    it('reuses the cached token unless a refresh is asked for', async () => {
      await service.getRoles();

      expect(getIdTokenResultMock).toHaveBeenCalledWith({
        forceRefresh: false,
      });
    });

    it('mints a fresh token when asked, so a new grant is visible', async () => {
      await service.getRoles(true);

      expect(getIdTokenResultMock).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });

    it('hasRole is true only for a role the token carries', async () => {
      await expect(service.hasRole('business')).resolves.toBe(true);
      await expect(service.hasRole('staff')).resolves.toBe(false);
    });

    // The business app admits `business` and `staff`, and a staff account holds
    // `staff` and not `business` (#1075).
    it('hasAnyRole is true when the token carries either alternative', async () => {
      tokenCarrying(['staff']);

      await expect(service.hasAnyRole(['business', 'staff'])).resolves.toBe(
        true,
      );
    });

    it('hasAnyRole is false when the token carries none of them', async () => {
      tokenCarrying(['admin']);

      await expect(service.hasAnyRole(['business', 'staff'])).resolves.toBe(
        false,
      );
    });

    it('hasAnyRole with an empty list admits nobody', async () => {
      await expect(service.hasAnyRole([])).resolves.toBe(false);
    });

    it('hasAnyRole forwards the refresh flag', async () => {
      await service.hasAnyRole(['business'], true);

      expect(getIdTokenResultMock).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });
  });

  describe('initialize', () => {
    let authStateChangeNextSpy: jest.SpyInstance;

    beforeEach(() => {
      jest
        .spyOn(FirebaseAuthentication, 'getCurrentUser')
        .mockResolvedValue({ user: { uid: '123' } } as unknown as Awaited<
          ReturnType<typeof FirebaseAuthentication.getCurrentUser>
        >);
      (FirebaseAuthentication.addListener as jest.Mock).mockImplementation(
        (event, callback) => {
          if (event === 'authStateChange') {
            callback({ user: { uid: '456' } });
          }
        },
      );
      authStateChangeNextSpy = jest.spyOn(service._authStateChange$, 'next');
    });

    it('should initialize auth state and set up listener', async () => {
      await service.initialize();

      expect(FirebaseAuthentication.getCurrentUser).toHaveBeenCalled();
      expect(authStateChangeNextSpy).toHaveBeenNthCalledWith(1, {
        user: { uid: '123' },
      });
      expect(FirebaseAuthentication.addListener).toHaveBeenCalledWith(
        'authStateChange',
        expect.any(Function),
      );
      expect(authStateChangeNextSpy).toHaveBeenNthCalledWith(2, {
        user: { uid: '456' },
      });
    });

    it('should treat a restored user as the conclusive auth state', async () => {
      await service.initialize();

      expect(service.isAuthStateRestored()).toBe(true);
      await expect(service.whenAuthStateRestored()).resolves.toBeUndefined();
    });

    describe('given the web, where a missing user is not yet conclusive', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        jest
          .spyOn(FirebaseAuthentication, 'getCurrentUser')
          .mockResolvedValue({ user: null } as unknown as Awaited<
            ReturnType<typeof FirebaseAuthentication.getCurrentUser>
          >);
      });

      it('should wait for the first authStateChange event', async () => {
        let notifyAuthStateChange: ((change: unknown) => void) | undefined;
        (FirebaseAuthentication.addListener as jest.Mock).mockImplementation(
          (event, callback) => {
            if (event === 'authStateChange') {
              notifyAuthStateChange = callback;
            }
          },
        );

        await service.initialize();

        expect(service.isAuthStateRestored()).toBe(false);

        notifyAuthStateChange?.({ user: { uid: '456' } });

        expect(service.isAuthStateRestored()).toBe(true);
        await expect(service.whenAuthStateRestored()).resolves.toBeUndefined();
      });

      it('should settle on a signed-out visitor too', async () => {
        (FirebaseAuthentication.addListener as jest.Mock).mockImplementation(
          (event, callback) => {
            if (event === 'authStateChange') {
              callback({ user: null });
            }
          },
        );

        await service.initialize();

        expect(service.isAuthStateRestored()).toBe(true);
      });
    });

    describe('given a native platform, where the first answer is final', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        jest
          .spyOn(FirebaseAuthentication, 'getCurrentUser')
          .mockResolvedValue({ user: null } as unknown as Awaited<
            ReturnType<typeof FirebaseAuthentication.getCurrentUser>
          >);
        (FirebaseAuthentication.addListener as jest.Mock).mockImplementation(
          () => undefined,
        );
      });

      it('should not hold routing back for an event that may never come', async () => {
        await service.initialize();

        expect(service.isAuthStateRestored()).toBe(true);
      });
    });
  });

  describe('whenAuthStateRestored', () => {
    it('should give up on a platform that never reports an auth state', async () => {
      jest.useFakeTimers();

      const waited = service.whenAuthStateRestored();
      jest.advanceTimersByTime(AUTH_RESTORE_TIMEOUT_MS);

      await expect(waited).resolves.toBeUndefined();
      expect(service.isAuthStateRestored()).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('isLoggedIn$', () => {
    describe('current value of authStateChange$ is null', () => {
      it('should emit false', () => {
        scheduler.run(({ expectObservable, cold }) => {
          cold('ab', {
            a: null,
            b: null,
          })
            .pipe(tap((value) => service._authStateChange$.next(value)))
            .subscribe();

          expectObservable(service.isLoggedIn$).toBe('-a', { a: false });
        });
      });
    });

    describe('current value of authStateChange$ is user but null', () => {
      it('should emit false', () => {
        scheduler.run(({ expectObservable, cold }) => {
          cold('ab', {
            a: null,
            b: { user: null },
          })
            .pipe(tap((value) => service._authStateChange$.next(value)))
            .subscribe();

          expectObservable(service.isLoggedIn$).toBe('-a', { a: false });
        });
      });
    });

    describe('current value of authStateChange$ is proper user', () => {
      it('should emit false', () => {
        scheduler.run(({ expectObservable, cold }) => {
          cold('abc', {
            a: null,
            b: { user: null },
            c: { user: {} },
          })
            .pipe(tap((value) => service._authStateChange$.next(value)))
            .subscribe();

          expectObservable(service.isLoggedIn$).toBe('-ab', {
            a: false,
            b: true,
          });
        });
      });
    });
  });

  describe('authStateChangeListener', () => {
    it('should emit auth state changes', () => {
      const authStateChangeNextSpy = jest.spyOn(
        service._authStateChange$,
        'next',
      );

      const newState = { user: { uid: '789' } };
      service.authStateChangeListener(newState);

      expect(authStateChangeNextSpy).toHaveBeenCalledWith(newState);
    });
  });

  describe('loginWithUsernameAndPassword', () => {
    beforeEach(() => {
      jest
        .spyOn(FirebaseAuthentication, 'signInWithEmailAndPassword')
        .mockResolvedValue({ user: { uid: '123' } } as unknown as Awaited<
          ReturnType<typeof FirebaseAuthentication.signInWithEmailAndPassword>
        >);
    });

    it('should call signInWithEmailAndPassword with correct credentials', async () => {
      const creds = { email: 'q@q.de', password: 'password' };
      const result = await service.loginWithUsernameAndPassword(creds);

      expect(
        FirebaseAuthentication.signInWithEmailAndPassword,
      ).toHaveBeenCalledWith(creds);
      expect(result).toEqual({ user: { uid: '123' } });
    });
  });

  describe('logout', () => {
    let removeAllListenersSpy: jest.SpyInstance;
    let terminateSpy: jest.SpyInstance;
    let clearPersistanceSpy: jest.SpyInstance;
    let reloadPageSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.spyOn(FirebaseAuthentication, 'signOut').mockResolvedValue();
      terminateSpy = jest
        .spyOn(firestoreUtils, 'terminate')
        .mockImplementation();
      clearPersistanceSpy = jest
        .spyOn(FirebaseFirestore, 'clearPersistence')
        .mockImplementation();
      removeAllListenersSpy = jest
        .spyOn(FirebaseFirestore, 'removeAllListeners')
        .mockImplementation();
      reloadPageSpy = jest.spyOn(service, 'reloadPage').mockImplementation();
    });

    it('should perform logout operations', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      await service.logout();

      expect(FirebaseAuthentication.signOut).toHaveBeenCalled();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(terminateSpy).toHaveBeenCalled();
      expect(clearPersistanceSpy).toHaveBeenCalled();
      expect(navigateRootMock).toHaveBeenCalledWith('login');
      expect(reloadPageSpy).toHaveBeenCalled();
    });

    it('should not clear persistence on a native platform', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      await service.logout();

      expect(clearPersistanceSpy).not.toHaveBeenCalled();
      expect(navigateRootMock).toHaveBeenCalledWith('login');
      expect(reloadPageSpy).toHaveBeenCalled();
    });

    it('should continue logout when Firebase cleanup operations fail', async () => {
      const removeListenersError = new Error('remove listeners failed');
      const signOutError = new Error('sign out failed');
      const terminateError = new Error('terminate failed');
      const clearPersistenceError = new Error('clear persistence failed');
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      removeAllListenersSpy.mockRejectedValue(removeListenersError);
      jest
        .spyOn(FirebaseAuthentication, 'signOut')
        .mockRejectedValue(signOutError);
      terminateSpy.mockRejectedValue(terminateError);
      clearPersistanceSpy.mockRejectedValue(clearPersistenceError);

      await service.logout();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error removing Firestore listeners during logout:',
        removeListenersError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error signing out:',
        signOutError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error terminating Firestore:',
        terminateError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error clearing Firestore persistence:',
        clearPersistenceError,
      );
      expect(navigateRootMock).toHaveBeenCalledWith('login');
      expect(reloadPageSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should clear the current auth state', async () => {
      const authStateChangeNextSpy = jest.spyOn(
        service._authStateChange$,
        'next',
      );

      await service.logout();

      expect(authStateChangeNextSpy).toHaveBeenCalledWith(null);
    });
  });

  describe('reloadPage', () => {
    it('should reload the browser window', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      expect(() => service.reloadPage()).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('registerWithUsernameAndPassword', () => {
    let createUserWithEmailAndPasswordSpy: jest.SpyInstance;

    beforeEach(() => {
      createUserWithEmailAndPasswordSpy = jest
        .spyOn(FirebaseAuthentication, 'createUserWithEmailAndPassword')
        .mockResolvedValue({ user: { uid: '123' } } as unknown as Awaited<
          ReturnType<
            typeof FirebaseAuthentication.createUserWithEmailAndPassword
          >
        >);
    });

    it('should call createUserWithEmailAndPassword with correct registration data', async () => {
      const registration = { email: 'q@q.de', password: 'password' };
      const result =
        await service.registerWithUsernameAndPassword(registration);

      expect(createUserWithEmailAndPasswordSpy).toHaveBeenCalledWith({
        email: registration.email,
        password: registration.password,
      });
      expect(result).toEqual({ user: { uid: '123' } });
    });
  });

  /**
   * The guest who registers during the meal (GitHub issue #1657).
   *
   * Everything at the table is filed under the anonymous uid - the session
   * document is *named* after it - so registering has to link the provider
   * onto that account rather than create a second one. These assertions are
   * about the three steps that follow the link and are nobody else's job: the
   * token refresh `RD-TS-40` requires, the profile `createUserOnAuthCreate`
   * will not write because linking fires no blocking trigger, and the auth
   * state push, without which every guard goes on reading `isAnonymous`.
   */
  describe('upgrading an anonymous table guest', () => {
    const MEMBER = { uid: 'guest-uid', isAnonymous: false } as never;

    /**
     * The `linkWith*` methods are assigned rather than spied on. The plugin is
     * automocked, and `jest.spyOn` needs the property to be there already -
     * which it is for the sign-in methods and is not for these, so a spy fails
     * with "does not exist in the provided object" rather than with anything
     * about the code under test.
     */
    const plugin = FirebaseAuthentication as unknown as Record<
      string,
      jest.Mock
    >;

    let linkWithEmailAndPassword: jest.Mock;
    let linkWithGoogle: jest.Mock;
    let linkWithApple: jest.Mock;
    let getIdToken: jest.Mock;
    let createUserSpy: jest.SpyInstance;
    let signInWithGoogleSpy: jest.SpyInstance;

    const asGuest = (): void =>
      service._authStateChange$.next({
        user: { uid: 'guest-uid', isAnonymous: true },
      } as never);

    beforeEach(() => {
      linkWithEmailAndPassword = jest.fn().mockResolvedValue({ user: MEMBER });
      linkWithGoogle = jest.fn().mockResolvedValue({ user: MEMBER });
      linkWithApple = jest.fn().mockResolvedValue({ user: MEMBER });
      getIdToken = jest.fn().mockResolvedValue({ token: 'fresh' });

      plugin['linkWithEmailAndPassword'] = linkWithEmailAndPassword;
      plugin['linkWithGoogle'] = linkWithGoogle;
      plugin['linkWithApple'] = linkWithApple;
      plugin['getIdToken'] = getIdToken;
      plugin['getCurrentUser'] = jest.fn().mockResolvedValue({ user: MEMBER });

      createUserSpy = jest
        .spyOn(FirebaseAuthentication, 'createUserWithEmailAndPassword')
        .mockResolvedValue({ user: MEMBER } as never);
      signInWithGoogleSpy = jest
        .spyOn(FirebaseAuthentication, 'signInWithGoogle')
        .mockResolvedValue({ user: MEMBER } as never);
      (FirebaseFunctions.callByName as jest.Mock).mockResolvedValue({
        created: true,
      });
    });

    it('links the password credential onto the guest account', async () => {
      asGuest();

      await service.registerWithUsernameAndPassword({
        email: 'guest@test.com',
        password: 'password',
      });

      expect(linkWithEmailAndPassword).toHaveBeenCalledWith({
        email: 'guest@test.com',
        password: 'password',
      });
      expect(createUserSpy).not.toHaveBeenCalled();
    });

    it('links Google and Apple onto the guest account', async () => {
      asGuest();
      await service.signInWithGoogleAccount();

      asGuest();
      await service.signInWithAppleAccount();

      expect(linkWithGoogle).toHaveBeenCalledWith({ mode: 'popup' });
      expect(linkWithApple).toHaveBeenCalledWith({ mode: 'popup' });
    });

    it('refreshes the token and writes the profile after linking', async () => {
      asGuest();

      await service.registerWithUsernameAndPassword({
        email: 'guest@test.com',
        password: 'password',
      });

      expect(getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'upgradeGuestAccount',
      });
    });

    it('reports the upgraded account so the guards stop reading a guest', async () => {
      asGuest();
      expect(service.getMember()).toBeNull();

      await service.registerWithUsernameAndPassword({
        email: 'guest@test.com',
        password: 'password',
      });

      expect(service.getMember()).toEqual(MEMBER);
    });

    /**
     * The account is registered by the time the profile call runs, so failing
     * the registration over it would report a failure for something that
     * succeeded. The callable is idempotent, so a later call repairs it.
     */
    it('still registers when the profile call fails', async () => {
      asGuest();
      (FirebaseFunctions.callByName as jest.Mock).mockRejectedValue(
        new Error('unavailable'),
      );
      const warn = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        service.registerWithUsernameAndPassword({
          email: 'guest@test.com',
          password: 'password',
        }),
      ).resolves.toEqual({ user: MEMBER });

      warn.mockRestore();
    });

    it('creates a new account when nobody is signed in', async () => {
      await service.registerWithUsernameAndPassword({
        email: 'new@test.com',
        password: 'password',
      });

      expect(createUserSpy).toHaveBeenCalled();
      expect(linkWithEmailAndPassword).not.toHaveBeenCalled();
    });

    /** A member who scans a table code orders as themselves and never links. */
    it('signs a member in normally', async () => {
      service._authStateChange$.next({ user: MEMBER } as never);

      await service.signInWithGoogleAccount();

      expect(signInWithGoogleSpy).toHaveBeenCalledWith({ mode: 'popup' });
      expect(linkWithGoogle).not.toHaveBeenCalled();
    });
  });

  describe('sendEmailVerification', () => {
    let sendEmailVerificationSpy: jest.SpyInstance;
    let setLanguageCodeSpy: jest.SpyInstance;

    beforeEach(() => {
      sendEmailVerificationSpy = jest
        .spyOn(FirebaseAuthentication, 'sendEmailVerification')
        .mockResolvedValue(undefined);
      setLanguageCodeSpy = jest
        .spyOn(FirebaseAuthentication, 'setLanguageCode')
        .mockResolvedValue(undefined);
    });

    it('should call sendEmailVerification', async () => {
      await service.sendEmailVerification();

      expect(sendEmailVerificationSpy).toHaveBeenCalled();
    });

    it('should send the mail in the given language', async () => {
      // The Firebase email templates render this mail, so the auth language
      // code is the only thing that decides which one is used (issue #1264).
      await service.sendEmailVerification('de');

      expect(setLanguageCodeSpy).toHaveBeenCalledWith({ languageCode: 'de' });
      expect(sendEmailVerificationSpy).toHaveBeenCalled();
    });

    it('should not touch the language code when none is given', async () => {
      await service.sendEmailVerification();

      expect(setLanguageCodeSpy).not.toHaveBeenCalled();
    });

    it('should still send when the language code is rejected', async () => {
      // Losing the verification mail is worse than sending it in English.
      setLanguageCodeSpy.mockRejectedValue(new Error('unsupported'));

      await service.sendEmailVerification('de');

      expect(sendEmailVerificationSpy).toHaveBeenCalled();
    });
  });

  describe('sendPasswordResetEmail', () => {
    let sendPasswordResetEmailSpy: jest.SpyInstance;

    beforeEach(() => {
      (
        FirebaseAuthentication as unknown as {
          sendPasswordResetEmail: jest.Mock;
        }
      ).sendPasswordResetEmail = jest.fn();
      sendPasswordResetEmailSpy = jest
        .spyOn(FirebaseAuthentication, 'sendPasswordResetEmail')
        .mockResolvedValue(undefined);
    });

    it('should call sendPasswordResetEmail with the given email', async () => {
      await service.sendPasswordResetEmail('q@q.de');

      expect(sendPasswordResetEmailSpy).toHaveBeenCalledWith({
        email: 'q@q.de',
      });
    });
  });

  describe('signInWithGoogleAccount', () => {
    beforeEach(() => {
      jest
        .spyOn(FirebaseAuthentication, 'signInWithGoogle')
        .mockResolvedValue({ user: { uid: '123' } } as unknown as Awaited<
          ReturnType<typeof FirebaseAuthentication.signInWithGoogle>
        >);
    });

    it('should call signInWithGoogle with popup mode', async () => {
      const result = await service.signInWithGoogleAccount();

      expect(FirebaseAuthentication.signInWithGoogle).toHaveBeenCalledWith({
        mode: 'popup',
      });
      expect(result).toEqual({ user: { uid: '123' } });
    });
  });

  describe('signInWithAppleAccount', () => {
    beforeEach(() => {
      jest
        .spyOn(FirebaseAuthentication, 'signInWithApple')
        .mockResolvedValue({ user: { uid: '123' } } as unknown as Awaited<
          ReturnType<typeof FirebaseAuthentication.signInWithApple>
        >);
    });

    it('should call signInWithApple with popup mode', async () => {
      const result = await service.signInWithAppleAccount();

      expect(FirebaseAuthentication.signInWithApple).toHaveBeenCalledWith({
        mode: 'popup',
      });
      expect(result).toEqual({ user: { uid: '123' } });
    });
  });

  describe('setupAnalyticsAndCrashlytics', () => {
    const originalBusinessFlag = process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'];

    beforeEach(() => {
      delete process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'];
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    afterEach(() => {
      if (originalBusinessFlag === undefined) {
        delete process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'];
      } else {
        process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = originalBusinessFlag;
      }
    });

    describe('given a user', () => {
      it('should set userid on analytics', async () => {
        const user = { uid: '123' } as unknown as SetupUserArg;
        await service.setupAnalyticsAndCrashlytics(user);

        expect(FirebaseAnalytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
      });
    });

    describe('given it is native platform', () => {
      it('should set userid on crashlytics', async () => {
        jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

        const user = { uid: '123' } as unknown as SetupUserArg;
        await service.setupAnalyticsAndCrashlytics(user);

        expect(FirebaseCrashlytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
      });
    });

    describe('given it is a web platform', () => {
      it('should not set userid on crashlytics', async () => {
        jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

        await service.setupAnalyticsAndCrashlytics({
          uid: '123',
        } as unknown as SetupUserArg);

        expect(FirebaseAnalytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
        expect(FirebaseCrashlytics.setUserId).not.toHaveBeenCalled();
      });
    });

    describe('given no user', () => {
      it('should not configure analytics or crashlytics', async () => {
        await service.setupAnalyticsAndCrashlytics(
          null as unknown as SetupUserArg,
        );

        expect(FirebaseAnalytics.setUserId).not.toHaveBeenCalled();
        expect(FirebaseCrashlytics.setUserId).not.toHaveBeenCalled();
      });
    });

    describe('given the business app', () => {
      it('should not configure analytics or crashlytics', async () => {
        process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = 'true';

        await service.setupAnalyticsAndCrashlytics({
          uid: '123',
        } as unknown as SetupUserArg);

        expect(FirebaseAnalytics.setUserId).not.toHaveBeenCalled();
        expect(FirebaseCrashlytics.setUserId).not.toHaveBeenCalled();
      });
    });
  });
});
