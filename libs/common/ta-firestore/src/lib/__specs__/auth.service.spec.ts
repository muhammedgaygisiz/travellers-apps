import { AUTH_RESTORE_TIMEOUT_MS, AuthService } from '../auth.service';
import { TestBed } from '@angular/core/testing';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from '../provide-firestore-utils';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
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

  describe('sendEmailVerification', () => {
    let sendEmailVerificationSpy: jest.SpyInstance;

    beforeEach(() => {
      sendEmailVerificationSpy = jest
        .spyOn(FirebaseAuthentication, 'sendEmailVerification')
        .mockResolvedValue(undefined);
    });

    it('should call sendEmailVerification', async () => {
      await service.sendEmailVerification();

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
