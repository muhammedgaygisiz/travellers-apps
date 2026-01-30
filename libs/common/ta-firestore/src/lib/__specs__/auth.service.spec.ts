import { AuthService } from '../auth.service';
import { TestBed } from '@angular/core/testing';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from '../provide-firestore-utils';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as firestoreUtils from 'firebase/firestore';

jest.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    getCurrentUser: jest.fn(),
    addListener: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
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

describe(AuthService.name, () => {
  let service: AuthService;

  beforeEach(() => {
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
      await service.logout();

      expect(FirebaseAuthentication.signOut).toHaveBeenCalled();
      expect(signOutSpy).toHaveBeenCalled();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(terminateSpy).toHaveBeenCalled();
      expect(clearPersistanceSpy).toHaveBeenCalled();
    });
  });
});
