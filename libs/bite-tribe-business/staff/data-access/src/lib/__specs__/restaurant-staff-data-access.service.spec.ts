import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { RestaurantStaffDataAccessService } from '../restaurant-staff-data-access.service';

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;
const getDocument = FirebaseFirestore.getDocument as jest.Mock;

/**
 * Everything here goes through a callable, which is the shape of the feature
 * rather than a preference: a staff grant is a custom claim and a Firestore
 * document that have to be written together, and a client can write neither
 * (issue #1537).
 */
describe(RestaurantStaffDataAccessService.name, () => {
  let service: RestaurantStaffDataAccessService;
  const restaurantIdFromUrl = signal<string | undefined>('restaurant-1');

  beforeEach(() => {
    jest.clearAllMocks();
    restaurantIdFromUrl.set('restaurant-1');

    TestBed.configureTestingModule({
      providers: [
        RestaurantStaffDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: { restaurantIdFromUrl },
        },
      ],
    });

    service = TestBed.inject(RestaurantStaffDataAccessService);
  });

  it('reads the staff of the restaurant in the route', async () => {
    callByName.mockResolvedValue({
      data: {
        restaurantId: 'restaurant-1',
        staff: [{ uid: 'waiter-1', email: 'waiter@example.com' }],
      },
    });

    const staff = await service.staffLoader({
      params: { restaurantId: 'restaurant-1' },
    } as never);

    expect(callByName).toHaveBeenCalledWith({
      name: 'listRestaurantStaff',
      data: { restaurantId: 'restaurant-1' },
    });
    expect(staff).toHaveLength(1);
  });

  /**
   * The route parameter is missing for exactly as long as it takes the router
   * to resolve, and a call with no restaurant would be rejected as
   * `invalid-argument`. Answering with an empty list keeps that out of the
   * console and off the page.
   */
  it('calls nothing until the route has a restaurant', async () => {
    const staff = await service.staffLoader({
      params: { restaurantId: undefined },
    } as never);

    expect(staff).toEqual([]);
    expect(callByName).not.toHaveBeenCalled();
  });

  /**
   * A callable that answers with no `staff` key is a shape the page has to
   * survive rather than render `undefined` rows from - the resource feeds an
   * `@for` directly.
   */
  it('treats a staff-less answer as an empty list', async () => {
    callByName.mockResolvedValue({ data: { restaurantId: 'restaurant-1' } });

    const staff = await service.staffLoader({
      params: { restaurantId: 'restaurant-1' },
    } as never);

    expect(staff).toEqual([]);
  });

  it('reads the restaurant for its name', async () => {
    getDocument.mockResolvedValue({
      snapshot: { id: 'restaurant-1', data: { name: 'Pizza Palace' } },
    });

    const restaurant = await service.restaurantLoader({
      params: { restaurantId: 'restaurant-1' },
    } as never);

    expect(restaurant?.name).toBe('Pizza Palace');
  });

  /**
   * The restaurant is read for its heading only, so a missing document is a
   * page without a subtitle rather than a failure. `ownedRestaurantGuard`
   * already refused anything the caller may not open.
   */
  it('answers with no restaurant when the document is gone', async () => {
    getDocument.mockResolvedValue({ snapshot: { id: 'restaurant-1' } });

    const restaurant = await service.restaurantLoader({
      params: { restaurantId: 'restaurant-1' },
    } as never);

    expect(restaurant).toBeUndefined();
  });

  it('reads no restaurant until the route has one', async () => {
    const restaurant = await service.restaurantLoader({
      params: { restaurantId: undefined },
    } as never);

    expect(restaurant).toBeUndefined();
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('adds by email, and reloads the list', async () => {
    callByName.mockResolvedValue({
      data: { restaurantId: 'restaurant-1', uid: 'waiter-1', status: 'added' },
    });
    const reload = jest.spyOn(service.staff, 'reload');

    const result = await service.addStaff('restaurant-1', 'waiter@example.com');

    expect(callByName).toHaveBeenCalledWith({
      name: 'addRestaurantStaff',
      data: { restaurantId: 'restaurant-1', email: 'waiter@example.com' },
    });
    expect(result.status).toBe('added');
    expect(reload).toHaveBeenCalled();
  });

  /**
   * Removal is by uid rather than by email, because the list already has the
   * uid and an email is a second thing that can be stale — the account the
   * owner is looking at is the one they clicked.
   */
  it('removes by uid, and reloads the list', async () => {
    callByName.mockResolvedValue({
      data: { restaurantId: 'restaurant-1', uid: 'waiter-1', roles: [] },
    });
    const reload = jest.spyOn(service.staff, 'reload');

    await service.removeStaff('restaurant-1', 'waiter-1');

    expect(callByName).toHaveBeenCalledWith({
      name: 'removeRestaurantStaff',
      data: { restaurantId: 'restaurant-1', uid: 'waiter-1' },
    });
    expect(reload).toHaveBeenCalled();
  });
});
