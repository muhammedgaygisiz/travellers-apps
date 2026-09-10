import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  RestaurantStaffDataAccessService,
  RestaurantStaffMember,
} from 'bite-tribe-business/staff-data-access';
import { ToastService } from 'toast';
import { RestaurantStaffService } from '../restaurant-staff.service';

const member: RestaurantStaffMember = {
  uid: 'waiter-1',
  email: 'waiter@example.com',
  displayName: 'Sam',
  addedBy: 'owner-1',
  addedAt: '2026-09-10T09:00:00.000Z',
};

/**
 * The failures here are all ordinary and recoverable — a mistyped address, an
 * account that already works somewhere else, an account that turns out to be
 * an operator — so each one is a toast over a list that is still correct,
 * never an error screen.
 */
describe(RestaurantStaffService.name, () => {
  let service: RestaurantStaffService;
  let present: jest.Mock;
  let addStaff: jest.Mock;
  let removeStaff: jest.Mock;
  const restaurantId = signal<string | undefined>('restaurant-1');

  const messageKeys = (): string[] =>
    present.mock.calls.map(([request]) => request.messageKey);

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    present = jest.fn().mockResolvedValue(undefined);
    addStaff = jest.fn().mockResolvedValue({ status: 'added' });
    removeStaff = jest.fn().mockResolvedValue(undefined);
    restaurantId.set('restaurant-1');

    TestBed.configureTestingModule({
      providers: [
        RestaurantStaffService,
        {
          provide: RestaurantStaffDataAccessService,
          useValue: {
            restaurantId,
            staff: { isLoading: (): boolean => false },
            staffValue: signal([]),
            restaurantValue: signal({ id: 'restaurant-1', name: 'Pizza' }),
            addStaff,
            removeStaff,
          },
        },
        {
          provide: BiteTribeStoreService,
          useValue: { isAuthenticated$: of(true), logout: jest.fn() },
        },
        { provide: ToastService, useValue: { present } },
      ],
    });

    service = TestBed.inject(RestaurantStaffService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('names the restaurant the page is about', () => {
    expect(service.restaurantName()).toBe('Pizza');
  });

  it('reports a grant as a grant', async () => {
    await service.addStaff('waiter@example.com');

    expect(addStaff).toHaveBeenCalledWith('restaurant-1', 'waiter@example.com');
    expect(messageKeys()).toEqual(['staff-added']);
  });

  /**
   * "Saved" would be true of both and useful for neither: an owner who added
   * the same person twice should be told nothing was written rather than
   * shown the success of a write that did not happen.
   */
  it('distinguishes the idempotent repeat', async () => {
    addStaff.mockResolvedValue({ status: 'already-staff' });

    await service.addStaff('waiter@example.com');

    expect(messageKeys()).toEqual(['staff-already-added']);
  });

  it('reports a refused grant without leaving the page', async () => {
    addStaff.mockRejectedValue(new Error('permission-denied'));

    await service.addStaff('waiter@example.com');

    expect(messageKeys()).toEqual(['staff-add-failed']);
    expect(service.saving()).toBe(false);
  });

  it('removes by uid and reports it', async () => {
    await service.removeStaff(member);

    expect(removeStaff).toHaveBeenCalledWith('restaurant-1', 'waiter-1');
    expect(messageKeys()).toEqual(['staff-removed']);
  });

  it('reports a failed removal', async () => {
    removeStaff.mockRejectedValue(new Error('failed-precondition'));

    await service.removeStaff(member);

    expect(messageKeys()).toEqual(['staff-remove-failed']);
  });

  /**
   * The route parameter is briefly absent while the router resolves. A call
   * with no restaurant would be rejected as `invalid-argument`, and a red
   * toast for something the owner did not do is worse than doing nothing.
   */
  it('calls nothing until the route has a restaurant', async () => {
    restaurantId.set(undefined);

    await service.addStaff('waiter@example.com');
    await service.removeStaff(member);

    expect(addStaff).not.toHaveBeenCalled();
    expect(removeStaff).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
  });
});
