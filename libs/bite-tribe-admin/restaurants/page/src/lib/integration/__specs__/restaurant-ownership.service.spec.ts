import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Restaurant } from 'model';
import { ToastService } from 'toast';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  RestaurantStaffMember,
  RestaurantsDataAccessService,
} from 'bite-tribe-admin/restaurants-data-access';
import { UserManagementDataAccessService } from 'bite-tribe-admin/user-management-data-access';
import { RestaurantOwnershipService } from '../restaurant-ownership.service';

jest.mock('bite-tribe-admin/restaurants-data-access');
jest.mock('bite-tribe-admin/user-management-data-access');
jest.mock('@capacitor-firebase/firestore');

const restaurant = (over: Partial<Restaurant> = {}): Restaurant => ({
  id: 'r1',
  name: 'Pizza Palace',
  position: { latitude: 46.948, longitude: 7.4474 },
  ...over,
});

describe(RestaurantOwnershipService.name, () => {
  let service: RestaurantOwnershipService;
  let restaurants: ReturnType<typeof signal<Restaurant[]>>;
  let dataAccessMock: {
    restaurantsValue: () => Restaurant[];
    restaurants: { isLoading: jest.Mock };
    assignRestaurantOwner: jest.Mock;
    revokeRestaurantOwner: jest.Mock;
    staffRestaurantId: ReturnType<typeof signal<string | undefined>>;
    restaurantStaff: { isLoading: jest.Mock };
    restaurantStaffValue: () => RestaurantStaffMember[];
    addRestaurantStaff: jest.Mock;
    removeRestaurantStaff: jest.Mock;
  };
  let toastMock: { present: jest.Mock };

  beforeEach(() => {
    restaurants = signal<Restaurant[]>([restaurant()]);
    dataAccessMock = {
      restaurantsValue: (): Restaurant[] => restaurants(),
      restaurants: { isLoading: jest.fn().mockReturnValue(false) },
      assignRestaurantOwner: jest.fn().mockResolvedValue({
        restaurantId: 'r1',
        ownerUserId: 'owner-1',
        claimStatus: 'claimed',
        status: 'assigned',
      }),
      revokeRestaurantOwner: jest.fn().mockResolvedValue({
        restaurantId: 'r1',
        previousOwnerUserId: 'owner-1',
        claimStatus: 'revoked',
      }),
      staffRestaurantId: signal<string | undefined>(undefined),
      restaurantStaff: { isLoading: jest.fn().mockReturnValue(false) },
      restaurantStaffValue: (): RestaurantStaffMember[] => [],
      addRestaurantStaff: jest
        .fn()
        .mockResolvedValue({ restaurantId: 'r1', uid: 'w1', status: 'added' }),
      removeRestaurantStaff: jest.fn().mockResolvedValue(undefined),
    };
    toastMock = { present: jest.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        RestaurantOwnershipService,
        { provide: RestaurantsDataAccessService, useValue: dataAccessMock },
        {
          provide: UserManagementDataAccessService,
          useValue: {
            users: {
              value: jest.fn().mockReturnValue([]),
              isLoading: jest.fn().mockReturnValue(false),
            },
          },
        },
        { provide: BiteTribeStoreService, useValue: { logout: jest.fn() } },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(RestaurantOwnershipService);
  });

  /**
   * Resolved from the list rather than held as its own copy, so a save that
   * reloads the list leaves the form showing what was stored rather than what
   * was submitted.
   */
  it('resolves the selection out of the reloaded list', () => {
    service.select(restaurant());

    expect(service.selected()?.claimStatus).toBeUndefined();

    restaurants.set([
      restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    ]);

    expect(service.selected()?.ownerUserId).toBe('owner-1');
  });

  it('forgets a selection the list no longer holds', () => {
    service.select(restaurant());
    restaurants.set([]);

    expect(service.selected()).toBeUndefined();
  });

  it('assigns through the data access and reports it', async () => {
    await service.assign('r1', 'owner-1', 'Verified on the phone.');

    expect(dataAccessMock.assignRestaurantOwner).toHaveBeenCalledWith(
      'r1',
      'owner-1',
      'Verified on the phone.',
    );
    expect(toastMock.present).toHaveBeenCalledWith({
      messageKey: 'admin-restaurant-ownership-assigned',
      outcome: 'success',
    });
    expect(service.saving()).toBe(false);
  });

  // "Saved" would be true of the idempotent repeat and useful for neither: an
  // operator who clicked twice should be told that nothing was written.
  it('reports the idempotent repeat differently from a fresh assignment', async () => {
    dataAccessMock.assignRestaurantOwner.mockResolvedValue({
      restaurantId: 'r1',
      ownerUserId: 'owner-1',
      claimStatus: 'claimed',
      status: 'already-assigned',
    });

    await service.assign('r1', 'owner-1', 'Verified on the phone.');

    expect(toastMock.present).toHaveBeenCalledWith({
      messageKey: 'admin-restaurant-ownership-already-assigned',
      outcome: 'success',
    });
  });

  it('reports a refused assignment as a failure and stops saving', async () => {
    dataAccessMock.assignRestaurantOwner.mockRejectedValue(
      new Error('already assigned to owner-2'),
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.assign('r1', 'owner-1', 'Verified on the phone.');

    expect(toastMock.present).toHaveBeenCalledWith({
      messageKey: 'admin-restaurant-ownership-assign-failed',
      outcome: 'failure',
    });
    expect(service.saving()).toBe(false);
  });

  it('revokes through the data access and reports it', async () => {
    await service.revoke('r1', 'Restaurant closed.');

    expect(dataAccessMock.revokeRestaurantOwner).toHaveBeenCalledWith(
      'r1',
      'Restaurant closed.',
    );
    expect(toastMock.present).toHaveBeenCalledWith({
      messageKey: 'admin-restaurant-ownership-revoked',
      outcome: 'success',
    });
  });

  it('reports a refused revocation as a failure', async () => {
    dataAccessMock.revokeRestaurantOwner.mockRejectedValue(
      new Error('not assigned'),
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.revoke('r1', 'Restaurant closed.');

    expect(toastMock.present).toHaveBeenCalledWith({
      messageKey: 'admin-restaurant-ownership-revoke-failed',
      outcome: 'failure',
    });
  });

  /**
   * The operator's copy of what a restaurant owner can already do, so a
   * restaurant that removed its last account with access has a way back
   * (issue #1537).
   */
  describe('staff', () => {
    it('loads the staff of the restaurant that was picked', () => {
      service.select(restaurant());

      expect(dataAccessMock.staffRestaurantId()).toBe('r1');
    });

    it('reports a grant as a grant', async () => {
      await service.addStaff('r1', 'waiter@example.com');

      expect(dataAccessMock.addRestaurantStaff).toHaveBeenCalledWith(
        'r1',
        'waiter@example.com',
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-restaurant-staff-added',
        outcome: 'success',
      });
    });

    it('distinguishes the idempotent repeat', async () => {
      dataAccessMock.addRestaurantStaff.mockResolvedValue({
        restaurantId: 'r1',
        uid: 'w1',
        status: 'already-staff',
      });

      await service.addStaff('r1', 'waiter@example.com');

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-restaurant-staff-already-added',
        outcome: 'success',
      });
    });

    it('reports a refused grant and releases the form', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      dataAccessMock.addRestaurantStaff.mockRejectedValue(
        new Error('failed-precondition'),
      );

      await service.addStaff('r1', 'operator@example.com');

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-restaurant-staff-add-failed',
        outcome: 'failure',
      });
      expect(service.staffSaving()).toBe(false);
      jest.restoreAllMocks();
    });

    it('removes by uid', async () => {
      await service.removeStaff('r1', {
        uid: 'w1',
        email: 'waiter@example.com',
        displayName: 'Sam',
        addedBy: 'owner-1',
        addedAt: '',
      });

      expect(dataAccessMock.removeRestaurantStaff).toHaveBeenCalledWith(
        'r1',
        'w1',
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'admin-restaurant-staff-removed',
        outcome: 'success',
      });
    });
  });
});
