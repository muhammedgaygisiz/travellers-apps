import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BehaviorSubject } from 'rxjs';
import type { Bite, Trip } from 'model';
import { TripDetailService } from '../trip-detail.service';

const trip: Trip = {
  id: 'trip-1',
  userId: 'owner',
  title: 'Asia',
  startDate: '2026-12-01',
};
const bites = [{ id: 'bite-1' } as Bite];

describe(TripDetailService.name, () => {
  let loaded$: BehaviorSubject<boolean>;
  let trip$: BehaviorSubject<Trip | undefined>;
  let bites$: BehaviorSubject<Bite[] | undefined>;
  let store: {
    tripsLoaded$: BehaviorSubject<boolean>;
    tripById$: jest.Mock;
    tripBites$: jest.Mock;
    loadMyTrips: jest.Mock;
    loadTripBites: jest.Mock;
  };
  let service: TripDetailService;

  beforeEach(() => {
    loaded$ = new BehaviorSubject(false);
    trip$ = new BehaviorSubject<Trip | undefined>(undefined);
    bites$ = new BehaviorSubject<Bite[] | undefined>(undefined);
    store = {
      tripsLoaded$: loaded$,
      tripById$: jest.fn(() => trip$),
      tripBites$: jest.fn(() => bites$),
      loadMyTrips: jest.fn(),
      loadTripBites: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        TripDetailService,
        { provide: BiteTribeStoreService, useValue: store },
      ],
    });
    service = TestBed.inject(TripDetailService);
  });

  it('reads the trips first when they are not loaded yet', () => {
    service.enter('trip-1');
    TestBed.tick();

    expect(store.loadMyTrips).toHaveBeenCalledTimes(1);
    expect(store.tripById$).toHaveBeenCalledWith('trip-1');
    expect(service.isLoading()).toBe(true);
    expect(service.notFound()).toBe(false);
  });

  it('reads the Bites once the trip is known', () => {
    service.enter('trip-1');
    loaded$.next(true);
    trip$.next(trip);
    TestBed.tick();

    expect(store.loadTripBites).toHaveBeenCalledWith(trip);
  });

  it('shows the Bites once they are read', () => {
    service.enter('trip-1');
    loaded$.next(true);
    trip$.next(trip);
    bites$.next(bites);
    TestBed.tick();

    expect(service.bites()).toBe(bites);
    expect(service.isLoading()).toBe(false);
  });

  it('reads the Bites again on a visit, even when they are cached', () => {
    loaded$.next(true);
    trip$.next(trip);
    bites$.next(bites);

    service.enter('trip-1');
    TestBed.tick();

    expect(store.loadMyTrips).not.toHaveBeenCalled();
    expect(store.loadTripBites).toHaveBeenCalledTimes(1);
    expect(store.loadTripBites).toHaveBeenCalledWith(trip);
  });

  it('reads the Bites only once per visit', () => {
    loaded$.next(true);
    trip$.next(trip);

    service.enter('trip-1');
    TestBed.tick();
    bites$.next(bites);
    TestBed.tick();

    expect(store.loadTripBites).toHaveBeenCalledTimes(1);
  });

  it('reads the Bites again on pull to refresh', () => {
    loaded$.next(true);
    trip$.next(trip);
    bites$.next(bites);
    service.enter('trip-1');
    TestBed.tick();

    service.reload();

    expect(store.loadTripBites).toHaveBeenCalledTimes(2);
  });

  it('is not found when the loaded trips do not hold the id', () => {
    loaded$.next(true);

    service.enter('someone-elses-trip');
    TestBed.tick();

    expect(service.notFound()).toBe(true);
    expect(service.isLoading()).toBe(false);
    expect(store.loadTripBites).not.toHaveBeenCalled();
  });

  it('does nothing on reload before the trip is known', () => {
    service.reload();

    expect(store.loadTripBites).not.toHaveBeenCalled();
  });
});
