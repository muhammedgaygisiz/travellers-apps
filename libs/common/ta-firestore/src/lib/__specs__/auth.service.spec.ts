import { AuthService } from '../auth.service';
import { TestBed } from '@angular/core/testing';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from '../provide-firestore-utils';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as firestoreUtils from 'firebase/firestore';
import * as authUtils from 'firebase/auth';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';
import { TestScheduler } from 'rxjs/testing';
import { cold } from 'jasmine-marbles';
import { of, tap } from 'rxjs';

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    getCurrentUser: jest.fn(),
    addListener: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    setUserId: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    setUserId: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    terminate: jest.fn(),
    clearPersistence: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('firebase/firestore');

jest.mock('firebase/auth');

const assertEqual = (a: any, b: any): void => {
  expect(a).toEqual(b);
};

describe(AuthService.name, () => {
  let service: AuthService;
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler(assertEqual);
    TestBed.configureTestingModule({
      providers: [
        { provide: FIREBASE_AUTH, useValue: { signOut: jest.fn() } },
        { provide: FIREBASE_FIRESTORE, useValue: {} },
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
    let signOutSpy: jest.SpyInstance;
    let removeAllListenersSpy: jest.SpyInstance;
    let terminateSpy: jest.SpyInstance;
    let clearPersistanceSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.spyOn(FirebaseAuthentication, 'signOut').mockResolvedValue();
      signOutSpy = jest.spyOn(service.auth, 'signOut').mockResolvedValue();
      terminateSpy = jest
        .spyOn(firestoreUtils, 'terminate')
        .mockImplementation();
      clearPersistanceSpy = jest
        .spyOn(FirebaseFirestore, 'clearPersistence')
        .mockImplementation();
      removeAllListenersSpy = jest
        .spyOn(FirebaseFirestore, 'removeAllListeners')
        .mockImplementation();
    });

    it('should perform logout operations', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      await service.logout();

      expect(FirebaseAuthentication.signOut).toHaveBeenCalled();
      expect(signOutSpy).toHaveBeenCalled();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(terminateSpy).toHaveBeenCalled();
      expect(clearPersistanceSpy).toHaveBeenCalled();
    });
  });

  describe('registerWithUsernameAndPassword', () => {
    let createUserWithEmailAndPasswordSpy: jest.SpyInstance;

    beforeEach(() => {
      createUserWithEmailAndPasswordSpy = jest
        .spyOn(authUtils, 'createUserWithEmailAndPassword')
        .mockResolvedValue({ user: { uid: '123' } } as any);
    });

    it('should call createUserWithEmailAndPassword with correct registration data', async () => {
      const registration = { email: 'q@q.de', password: 'password' };
      const result =
        await service.registerWithUsernameAndPassword(registration);

      expect(createUserWithEmailAndPasswordSpy).toHaveBeenCalledWith(
        service.auth,
        registration.email,
        registration.password,
      );
      expect(result).toEqual({ user: { uid: '123' } });
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
    beforeEach(() => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    describe('given a user', () => {
      it('should set userid on analytics', () => {
        const user = { uid: '123' } as any;
        service.setupAnalyticsAndCrashlytics(user);

        expect(FirebaseAnalytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
      });
    });

    describe('given it is native platform', () => {
      it('should set userid on crashlytics', () => {
        jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

        const user = { uid: '123' } as any;
        service.setupAnalyticsAndCrashlytics(user);

        expect(FirebaseCrashlytics.setUserId).toHaveBeenCalledWith({
          userId: '123',
        });
      });
    });
  });
});
