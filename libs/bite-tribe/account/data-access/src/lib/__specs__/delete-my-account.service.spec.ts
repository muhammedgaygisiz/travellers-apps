import { TestBed } from '@angular/core/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { AnalyticsService, AuthService } from 'ta-firestore';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { BehaviorSubject } from 'rxjs';
import type { PublicUser } from 'model';
import { DeleteMyAccountService } from '../delete-my-account.service';

jest.mock('@capacitor-firebase/authentication');

const reauthRequired = (): Error =>
  Object.assign(new Error('reauth_required'), { code: 'failed-precondition' });

const CONFIRMED = { confirmedUid: 'user-1' };

describe(DeleteMyAccountService.name, () => {
  let service: DeleteMyAccountService;

  const deleteOwnAccount = jest.fn();
  const logout = jest.fn();
  const signInWithGoogleAccount = jest.fn();
  const signInWithAppleAccount = jest.fn();
  const loginWithUsernameAndPassword = jest.fn();
  const getUser = jest.fn();
  const logEvent = jest.fn();
  const publicUser$ = new BehaviorSubject<PublicUser | undefined>(undefined);

  const setCurrentUser = (
    user: Record<string, unknown> | null = {
      uid: 'user-1',
      providerData: [{ providerId: 'password' }],
    },
  ): void => {
    (FirebaseAuthentication.getCurrentUser as jest.Mock).mockResolvedValue({
      user,
    });
  };

  const setProviders = (...providerIds: string[]): void =>
    setCurrentUser({
      uid: 'user-1',
      providerData: providerIds.map((providerId) => ({ providerId })),
    });

  const setProvider = (providerId: string): void => setProviders(providerId);

  beforeEach(() => {
    jest.clearAllMocks();
    deleteOwnAccount.mockResolvedValue({ status: 'completed' });
    logout.mockResolvedValue(undefined);
    signInWithGoogleAccount.mockResolvedValue(undefined);
    signInWithAppleAccount.mockResolvedValue(undefined);
    loginWithUsernameAndPassword.mockResolvedValue(undefined);
    getUser.mockReturnValue({
      uid: 'user-1',
      email: 'gone@example.com',
      displayName: null,
      photoUrl: null,
      providerData: [{ providerId: 'password' }],
    });
    publicUser$.next(undefined);
    setCurrentUser();

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeApiService, useValue: { deleteOwnAccount } },
        { provide: BiteTribeStoreService, useValue: { publicUser$ } },
        {
          provide: AuthService,
          useValue: {
            logout,
            getUser,
            signInWithGoogleAccount,
            signInWithAppleAccount,
            loginWithUsernameAndPassword,
          },
        },
        { provide: AnalyticsService, useValue: { logEvent } },
      ],
    });

    service = TestBed.inject(DeleteMyAccountService);
    service.reset();
  });

  describe('the identity of the account that would be deleted', () => {
    it('names the signed-in account with its sign-in method', () => {
      expect(service.identity()).toEqual({
        uid: 'user-1',
        displayName: '',
        email: 'gone@example.com',
        photoUrl: '',
        signInMethod: 'password',
      });
    });

    it('prefers the profile name and photo the user recognizes', () => {
      publicUser$.next({
        userId: 'user-1',
        displayName: 'Mia Fernandes',
        email: 'mia@example.com',
        photoUrl: 'https://example.com/mia.jpg',
      } as PublicUser);

      expect(service.identity()).toMatchObject({
        displayName: 'Mia Fernandes',
        photoUrl: 'https://example.com/mia.jpg',
        email: 'gone@example.com',
      });
    });

    it('ignores a profile left over from another account', () => {
      publicUser$.next({
        userId: 'someone-else',
        displayName: 'Someone Else',
        email: 'someone@example.com',
        photoUrl: 'https://example.com/someone.jpg',
      } as PublicUser);

      expect(service.identity()).toMatchObject({
        uid: 'user-1',
        displayName: '',
        photoUrl: '',
      });
    });

    it.each([
      ['google.com', 'google'],
      ['apple.com', 'apple'],
      ['github.com', 'unknown'],
    ])('reports %s as %s', (providerId, signInMethod) => {
      getUser.mockReturnValue({
        uid: 'user-1',
        email: null,
        providerData: [{ providerId }],
      });

      expect(service.identity()?.signInMethod).toBe(signInMethod);
    });

    // Android lists the Firebase user itself first; reading that entry as the
    // sign-in method is what made every account look unknown (issue #1385).
    it('skips the reserved Firebase entry the native SDK lists first', () => {
      getUser.mockReturnValue({
        uid: 'user-1',
        email: 'gone@example.com',
        providerData: [{ providerId: 'firebase' }, { providerId: 'password' }],
      });

      expect(service.identity()?.signInMethod).toBe('password');
    });

    it('is empty while nobody is signed in', () => {
      getUser.mockReturnValue(null);

      expect(service.identity()).toBeNull();
    });
  });

  describe('given the deletion succeeds', () => {
    it('signs the user out', async () => {
      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(true);

      expect(logout).toHaveBeenCalled();
      expect(service.state()).toBe('idle');
      expect(logEvent).toHaveBeenCalledWith('account_deletion_completed');
    });
  });

  describe('given the session no longer matches the confirmed account', () => {
    it('deletes nothing when another account is signed in', async () => {
      setCurrentUser({
        uid: 'user-2',
        providerData: [{ providerId: 'password' }],
      });

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(deleteOwnAccount).not.toHaveBeenCalled();
      expect(service.state()).toBe('failed');
      expect(service.failure()).toBe('account-changed');
      expect(logEvent).toHaveBeenCalledWith('account_deletion_failed', {
        reason: 'account_changed',
      });
    });

    it('deletes nothing when the session is gone', async () => {
      setCurrentUser(null);

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(deleteOwnAccount).not.toHaveBeenCalled();
      expect(service.failure()).toBe('account-changed');
    });

    it('deletes nothing when the provider sheet signed a different account in', async () => {
      setProvider('google.com');
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());
      signInWithGoogleAccount.mockImplementationOnce(async () => {
        setCurrentUser({
          uid: 'user-2',
          providerData: [{ providerId: 'google.com' }],
        });
      });

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
      expect(logout).not.toHaveBeenCalled();
      expect(service.failure()).toBe('account-changed');
    });
  });

  describe('given the sign-in is too old', () => {
    it('asks for the password on an email/password account', async () => {
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(service.passwordRequired()).toBe(true);
      expect(logout).not.toHaveBeenCalled();
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
    });

    it('asks for the password when the native provider list starts with Firebase', async () => {
      setProviders('firebase', 'password');
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(service.passwordRequired()).toBe(true);
      expect(signInWithGoogleAccount).not.toHaveBeenCalled();
      expect(logout).not.toHaveBeenCalled();
    });

    // A provider the app cannot open a sign-in sheet for has no way back other
    // than the password, so it must be asked for rather than skipped.
    it('asks for the password on a provider it cannot re-sign in', async () => {
      setProvider('github.com');
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(service.passwordRequired()).toBe(true);
      expect(service.state()).toBe('idle');
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
    });

    it('retries with the supplied password', async () => {
      deleteOwnAccount
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce({ status: 'completed' });

      await expect(
        service.deleteAccount({ ...CONFIRMED, password: 'hunter2' }),
      ).resolves.toBe(true);

      expect(loginWithUsernameAndPassword).toHaveBeenCalledWith({
        email: 'gone@example.com',
        password: 'hunter2',
      });
      expect(deleteOwnAccount).toHaveBeenCalledTimes(2);
      expect(logout).toHaveBeenCalled();
    });

    it('re-signs a Google account in without asking for anything', async () => {
      setProvider('google.com');
      deleteOwnAccount
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce({ status: 'completed' });

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(true);

      expect(signInWithGoogleAccount).toHaveBeenCalled();
      expect(service.passwordRequired()).toBe(false);
      expect(logout).toHaveBeenCalled();
    });

    it('re-signs an Apple account in without asking for anything', async () => {
      setProvider('apple.com');
      deleteOwnAccount
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce({ status: 'completed' });

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(true);

      expect(signInWithAppleAccount).toHaveBeenCalled();
    });

    it('fails without deleting when the fresh sign-in is rejected', async () => {
      setProvider('google.com');
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());
      signInWithGoogleAccount.mockRejectedValueOnce(new Error('cancelled'));

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(service.state()).toBe('failed');
      expect(service.failure()).toBe('reauth-failed');
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
      expect(logout).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith('account_deletion_failed', {
        reason: 'reauth_failed',
      });
    });

    // The generic copy asks for a retry, and a retry with the same wrong
    // password fails identically, so the refusal gets its own message.
    it('reports a refused password as a failed re-authentication', async () => {
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());
      loginWithUsernameAndPassword.mockRejectedValueOnce(
        new Error('wrong-password'),
      );

      await expect(
        service.deleteAccount({ ...CONFIRMED, password: 'wrong' }),
      ).resolves.toBe(false);

      expect(service.failure()).toBe('reauth-failed');
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe('given the deletion fails for another reason', () => {
    it('reports the failure and keeps the user signed in', async () => {
      deleteOwnAccount.mockRejectedValueOnce(new Error('internal'));

      await expect(service.deleteAccount(CONFIRMED)).resolves.toBe(false);

      expect(service.state()).toBe('failed');
      expect(service.failure()).toBe('generic');
      expect(logout).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith('account_deletion_failed', {
        reason: 'unknown',
      });
    });
  });
});
