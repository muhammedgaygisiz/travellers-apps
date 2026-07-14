import { AuthService } from '../auth.service';
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

const assertEqual = (a: any, b: any): void => {
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
          .mockReturnValue({ user: { uid: '123' } } as any);
      });

      it('should return the user', async () => {
        const user = service.getUser();
        expect(user).toEqual({ uid: '123' });
      });
    });

    describe('given no user', () => {
      beforeEach(() => {
        jest.spyOn(service, 'authState').mockReturnValue({ user: null } as any);
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
        .mockResolvedValue({ user: { uid: '123' } } as any);
      (FirebaseAuthentication.addListener as jest.Mock).mockImplementation(
        (event, callback) => {
          if (event === 'authStateChange') {
            callback({ user: { uid: '456' } });
          }
        },
      );
      authStateChangeNextSpy = jest.spyOn(
        (service as any)._authStateChange$,
        'next',
      );
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
  });

  describe('isLoggedIn$', () => {
    describe('current value of authStateChange$ is null', () => {
      it('should emit false', () => {
        scheduler.run(({ expectObservable, cold }) => {
          cold('ab', {
            a: null,
            b: null,
          })
            .pipe(
              tap((value) => (service as any)._authStateChange$.next(value)),
            )
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
            .pipe(
              tap((value) => (service as any)._authStateChange$.next(value)),
            )
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
            .pipe(
              tap((value) => (service as any)._authStateChange$.next(value)),
            )
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
        (service as any)._authStateChange$,
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
        .mockResolvedValue({ user: { uid: '123' } } as any);
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
        (service as any)._authStateChange$,
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
        .mockResolvedValue({ user: { uid: '123' } } as any);
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

  describe('registerWithGoogleAccount', () => {
    beforeEach(() => {
      jest
        .spyOn(FirebaseAuthentication, 'signInWithGoogle')
        .mockResolvedValue({ user: { uid: '123' } } as any);
    });

    it('should call signInWithGoogle with popup mode', async () => {
      const result = await service.registerWithGoogleAccount();

      expect(FirebaseAuthentication.signInWithGoogle).toHaveBeenCalledWith({
        mode: 'popup',
      });
      expect(result).toEqual({ user: { uid: '123' } });
    });
  });

  describe('registerWithAppleAccount', () => {
    beforeEach(() => {
      jest
        .spyOn(FirebaseAuthentication, 'signInWithApple')
        .mockResolvedValue({ user: { uid: '123' } } as any);
    });

    it('should call signInWithApple with popup mode', async () => {
      const result = await service.registerWithAppleAccount();

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
        const user = { uid: '123' } as any;
        await service.setupAnalyticsAndCrashlytics(user);

        expect(FirebaseAnalytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
      });
    });

    describe('given it is native platform', () => {
      it('should set userid on crashlytics', async () => {
        jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

        const user = { uid: '123' } as any;
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
        } as any);

        expect(FirebaseAnalytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
        expect(FirebaseCrashlytics.setUserId).not.toHaveBeenCalled();
      });
    });

    describe('given no user', () => {
      it('should not configure analytics or crashlytics', async () => {
        await service.setupAnalyticsAndCrashlytics(null as any);

        expect(FirebaseAnalytics.setUserId).not.toHaveBeenCalled();
        expect(FirebaseCrashlytics.setUserId).not.toHaveBeenCalled();
      });
    });

    describe('given the business app', () => {
      it('should not configure analytics or crashlytics', async () => {
        process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = 'true';

        await service.setupAnalyticsAndCrashlytics({
          uid: '123',
        } as any);

        expect(FirebaseAnalytics.setUserId).not.toHaveBeenCalled();
        expect(FirebaseCrashlytics.setUserId).not.toHaveBeenCalled();
      });
    });
  });
});
