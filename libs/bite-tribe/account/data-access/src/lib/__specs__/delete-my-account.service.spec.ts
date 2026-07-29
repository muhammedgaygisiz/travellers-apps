import { TestBed } from '@angular/core/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsService, AuthService } from 'ta-firestore';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { DeleteMyAccountService } from '../delete-my-account.service';

jest.mock('@capacitor-firebase/authentication');

const reauthRequired = (): Error =>
  Object.assign(new Error('reauth_required'), { code: 'failed-precondition' });

describe(DeleteMyAccountService.name, () => {
  let service: DeleteMyAccountService;

  const deleteOwnAccount = jest.fn();
  const logout = jest.fn();
  const signInWithGoogleAccount = jest.fn();
  const signInWithAppleAccount = jest.fn();
  const loginWithUsernameAndPassword = jest.fn();
  const getUser = jest.fn();
  const logEvent = jest.fn();

  const setProvider = (providerId: string): void => {
    (FirebaseAuthentication.getCurrentUser as jest.Mock).mockResolvedValue({
      user: { providerData: [{ providerId }] },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deleteOwnAccount.mockResolvedValue({ status: 'completed' });
    logout.mockResolvedValue(undefined);
    signInWithGoogleAccount.mockResolvedValue(undefined);
    signInWithAppleAccount.mockResolvedValue(undefined);
    loginWithUsernameAndPassword.mockResolvedValue(undefined);
    getUser.mockReturnValue({ uid: 'user-1', email: 'gone@example.com' });
    setProvider('password');

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeApiService, useValue: { deleteOwnAccount } },
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

  describe('given the deletion succeeds', () => {
    it('signs the user out', async () => {
      await expect(service.deleteAccount()).resolves.toBe(true);

      expect(logout).toHaveBeenCalled();
      expect(service.state()).toBe('idle');
      expect(logEvent).toHaveBeenCalledWith('account_deletion_completed');
    });
  });

  describe('given the sign-in is too old', () => {
    it('asks for the password on an email/password account', async () => {
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());

      await expect(service.deleteAccount()).resolves.toBe(false);

      expect(service.passwordRequired()).toBe(true);
      expect(logout).not.toHaveBeenCalled();
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
    });

    it('retries with the supplied password', async () => {
      deleteOwnAccount
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce({ status: 'completed' });

      await expect(
        service.deleteAccount({ password: 'hunter2' }),
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

      await expect(service.deleteAccount()).resolves.toBe(true);

      expect(signInWithGoogleAccount).toHaveBeenCalled();
      expect(service.passwordRequired()).toBe(false);
      expect(logout).toHaveBeenCalled();
    });

    it('re-signs an Apple account in without asking for anything', async () => {
      setProvider('apple.com');
      deleteOwnAccount
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce({ status: 'completed' });

      await expect(service.deleteAccount()).resolves.toBe(true);

      expect(signInWithAppleAccount).toHaveBeenCalled();
    });

    it('fails without deleting when the fresh sign-in is rejected', async () => {
      setProvider('google.com');
      deleteOwnAccount.mockRejectedValueOnce(reauthRequired());
      signInWithGoogleAccount.mockRejectedValueOnce(new Error('cancelled'));

      await expect(service.deleteAccount()).resolves.toBe(false);

      expect(service.state()).toBe('failed');
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1);
      expect(logout).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith('account_deletion_failed', {
        reason: 'reauth_failed',
      });
    });
  });

  describe('given the deletion fails for another reason', () => {
    it('reports the failure and keeps the user signed in', async () => {
      deleteOwnAccount.mockRejectedValueOnce(new Error('internal'));

      await expect(service.deleteAccount()).resolves.toBe(false);

      expect(service.state()).toBe('failed');
      expect(logout).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith('account_deletion_failed', {
        reason: 'unknown',
      });
    });
  });
});
