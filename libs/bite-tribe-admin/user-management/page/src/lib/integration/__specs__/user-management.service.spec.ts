import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  AdminUser,
  UserManagementDataAccessService,
} from 'bite-tribe-admin/user-management-data-access';
import { ToastService } from 'toast';
import {
  ownedRestaurantsOf,
  UserManagementService,
} from '../user-management.service';

jest.mock('bite-tribe-admin/user-management-data-access');
jest.mock('bite-tribe/store');

/** The error `setUserRoles` throws when the account still owns restaurants. */
const ownershipRefusal = (holdings: unknown): unknown => ({
  code: 'functions/failed-precondition',
  message: 'The account still owns …',
  details: { reason: 'role-holdings', role: 'business', holdings },
});

describe('ownedRestaurantsOf', () => {
  it('reads the restaurants from the refusal details', () => {
    expect(ownedRestaurantsOf(ownershipRefusal(["Sam's (r1)", 'r2']))).toEqual([
      "Sam's (r1)",
      'r2',
    ]);
  });

  it('skips holdings that are not text', () => {
    expect(ownedRestaurantsOf(ownershipRefusal(['r1', 7]))).toEqual(['r1']);
  });

  it.each([
    ['no error object', 'failed'],
    ['no error at all', null],
    ['no details', { code: 'functions/internal' }],
    ['details that are not an object', { details: 'x' }],
    ['another refusal', { details: { reason: 'other', holdings: ['r1'] } }],
    ['holdings that are not a list', ownershipRefusal('r1')],
    ['no holdings', { details: { reason: 'role-holdings' } }],
  ])('returns nothing for %s', (_, error) => {
    expect(ownedRestaurantsOf(error)).toBeUndefined();
  });
});

describe(UserManagementService.name, () => {
  let service: UserManagementService;
  let dataAccessMock: {
    users: { value: jest.Mock; isLoading: jest.Mock };
    setRoles: jest.Mock;
    setSubscriptionTier: jest.Mock;
    setBlocked: jest.Mock;
    reload: jest.Mock;
  };
  let storeMock: {
    user: ReturnType<typeof signal<{ uid: string } | undefined>>;
    logout: jest.Mock;
  };
  let toastMock: { present: jest.Mock };

  const user = { uid: 'u1', email: 'owner@test.com' } as AdminUser;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    dataAccessMock = {
      users: {
        value: jest.fn().mockReturnValue([user]),
        isLoading: jest.fn().mockReturnValue(false),
      },
      setRoles: jest.fn().mockResolvedValue({ uid: 'u1', roles: [] }),
      setSubscriptionTier: jest.fn().mockResolvedValue(undefined),
      setBlocked: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn(),
    };
    storeMock = { user: signal({ uid: 'admin' }), logout: jest.fn() };
    toastMock = { present: jest.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        UserManagementService,
        { provide: UserManagementDataAccessService, useValue: dataAccessMock },
        { provide: BiteTribeStoreService, useValue: storeMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(UserManagementService);
  });

  it('lists the users and the signed-in operator', () => {
    expect(service.users()).toEqual([user]);
    expect(service.loading()).toBe(false);
    expect(service.operatorUid()).toBe('admin');
  });

  it('lists nothing before the users load', () => {
    dataAccessMock.users.value.mockReturnValue(undefined);

    expect(service.users()).toEqual([]);
  });

  it('resolves the selection out of the list', () => {
    expect(service.selected()).toBeUndefined();

    service.select(user);

    expect(service.selected()).toBe(user);
  });

  describe('save', () => {
    it('saves the roles, reloads and confirms', async () => {
      await service.save('u1', ['business']);

      expect(dataAccessMock.setRoles).toHaveBeenCalledWith('u1', ['business']);
      expect(dataAccessMock.reload).toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-saved',
        outcome: 'success',
      });
      expect(service.saving()).toBe(false);
    });

    it('is saving while the write runs', async () => {
      let saving: boolean | undefined;
      dataAccessMock.setRoles.mockImplementation(async () => {
        saving = service.saving();
      });

      await service.save('u1', []);

      expect(saving).toBe(true);
    });

    /** Issue #1539: the operator learns what to revoke first. */
    it('names the restaurants the account still owns', async () => {
      dataAccessMock.setRoles.mockRejectedValue(
        ownershipRefusal(["Sam's (r1)", 'r2']),
      );

      await service.save('u1', []);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-save-refused-owns-restaurants',
        params: { restaurants: "Sam's (r1), r2" },
        outcome: 'failure',
      });
      expect(dataAccessMock.reload).not.toHaveBeenCalled();
      expect(service.saving()).toBe(false);
    });

    it('reports any other failure generically', async () => {
      dataAccessMock.setRoles.mockRejectedValue(new Error('offline'));

      await service.save('u1', []);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-save-failed',
        outcome: 'failure',
      });
    });

    it('reports a refusal naming no restaurant generically', async () => {
      dataAccessMock.setRoles.mockRejectedValue(ownershipRefusal([]));

      await service.save('u1', []);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-save-failed',
        outcome: 'failure',
      });
    });
  });

  describe('saveSubscriptionTier', () => {
    it('saves the tier and confirms', async () => {
      await service.saveSubscriptionTier('u1', 'pro', 'gift');

      expect(dataAccessMock.setSubscriptionTier).toHaveBeenCalledWith(
        'u1',
        'pro',
        'gift',
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-tier-saved',
        outcome: 'success',
      });
      expect(service.savingTier()).toBe(false);
    });

    it('reports a failed save', async () => {
      dataAccessMock.setSubscriptionTier.mockRejectedValue(new Error('x'));

      await service.saveSubscriptionTier('u1', 'pro', 'gift');

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-tier-save-failed',
        outcome: 'failure',
      });
    });
  });

  describe('saveBlocked', () => {
    it.each([
      [true, 'admin-users-blocked-saved'],
      [false, 'admin-users-unblocked-saved'],
    ])('confirms blocked=%s', async (blocked, messageKey) => {
      await service.saveBlocked('u1', blocked);

      expect(dataAccessMock.setBlocked).toHaveBeenCalledWith('u1', blocked);
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey,
        outcome: 'success',
      });
      expect(service.savingBlocked()).toBe(false);
    });

    it('reports a failed save', async () => {
      dataAccessMock.setBlocked.mockRejectedValue(new Error('x'));

      await service.saveBlocked('u1', true);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-users-block-save-failed',
        outcome: 'failure',
      });
    });
  });

  it('logs out through the store', () => {
    service.logout();

    expect(storeMock.logout).toHaveBeenCalled();
  });
});
