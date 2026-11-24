import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { Restaurant } from 'model';
import { BehaviorSubject, of } from 'rxjs';
import { RestaurantDataAccessService } from '../restaurant-data-access.service';

const RESTAURANT = { id: 'r-1', name: 'Trattoria' } as Restaurant;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  TestBed.tick();
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

/** GitHub issue #2132. */
describe('RestaurantDataAccessService follow', () => {
  let userId$: BehaviorSubject<string | undefined>;
  let restaurant$: BehaviorSubject<Restaurant | undefined>;
  let api: {
    isFollowingRestaurant: jest.Mock;
    followRestaurant: jest.Mock;
    unfollowRestaurant: jest.Mock;
  };
  let store: { submitLikeClick: jest.Mock };

  const setUp = (): RestaurantDataAccessService => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BiteTribeApiService, useValue: api },
        {
          provide: BiteTribeStoreService,
          useValue: {
            ...store,
            bite$: of(undefined),
            biteIdFromUrl: (): undefined => undefined,
            bitesByRestaurant$: of([]),
            userId$,
            restaurant$,
            restaurantNotFound$: of(false),
          },
        },
      ],
    });

    return TestBed.inject(RestaurantDataAccessService);
  };

  beforeEach(() => {
    userId$ = new BehaviorSubject<string | undefined>('guest-1');
    restaurant$ = new BehaviorSubject<Restaurant | undefined>(RESTAURANT);
    api = {
      isFollowingRestaurant: jest.fn().mockResolvedValue(false),
      followRestaurant: jest.fn().mockResolvedValue(undefined),
      unfollowRestaurant: jest.fn().mockResolvedValue(undefined),
    };
    store = { submitLikeClick: jest.fn() };
  });

  it("reads whether the guest follows the page's restaurant", async () => {
    api.isFollowingRestaurant.mockResolvedValue(true);
    const service = setUp();
    await flush();

    expect(api.isFollowingRestaurant).toHaveBeenCalledWith('guest-1', 'r-1');
    expect(service.following()).toBe(true);
  });

  it('asks nothing when signed out or on a place that is not stored', async () => {
    userId$.next(undefined);
    const service = setUp();
    await flush();
    expect(service.following()).toBeUndefined();

    userId$.next('guest-1');
    restaurant$.next({ ...RESTAURANT, unsaved: true });
    await flush();
    expect(service.following()).toBeUndefined();
    expect(api.isFollowingRestaurant).not.toHaveBeenCalled();
    expect(await service.toggleFollow()).toBe(true);
    expect(api.followRestaurant).not.toHaveBeenCalled();
  });

  it('leaves the state unknown when the read fails', async () => {
    api.isFollowingRestaurant.mockRejectedValue(new Error('offline'));
    const service = setUp();
    await flush();

    expect(service.following()).toBeUndefined();
  });

  it('follows, then unfollows, showing each state at once', async () => {
    const service = setUp();
    await flush();

    const follow = service.toggleFollow();
    expect(service.following()).toBe(true);
    expect(service.followPending()).toBe(true);
    expect(await follow).toBe(true);
    expect(api.followRestaurant).toHaveBeenCalledWith('guest-1', 'r-1');
    expect(service.followPending()).toBe(false);

    expect(await service.toggleFollow()).toBe(true);
    expect(api.unfollowRestaurant).toHaveBeenCalledWith('guest-1', 'r-1');
    expect(service.following()).toBe(false);
  });

  it('puts the old state back when the write is refused', async () => {
    api.followRestaurant.mockRejectedValue(new Error('permission-denied'));
    const service = setUp();
    await flush();

    expect(await service.toggleFollow()).toBe(false);
    expect(service.following()).toBe(false);
  });

  it('ignores a second tap while a write is in flight', async () => {
    const service = setUp();
    await flush();

    const first = service.toggleFollow();
    expect(await service.toggleFollow()).toBe(true);
    await first;

    expect(api.followRestaurant).toHaveBeenCalledTimes(1);
    expect(api.unfollowRestaurant).not.toHaveBeenCalled();
  });

  it('keeps one read for the same restaurant re-emitted', async () => {
    setUp();
    await flush();
    restaurant$.next({ ...RESTAURANT });
    await flush();

    expect(api.isFollowingRestaurant).toHaveBeenCalledTimes(1);
  });

  it('passes a like click to the store', () => {
    const service = setUp();
    service.submitLikeClick({} as never);

    expect(store.submitLikeClick).toHaveBeenCalled();
  });
});
