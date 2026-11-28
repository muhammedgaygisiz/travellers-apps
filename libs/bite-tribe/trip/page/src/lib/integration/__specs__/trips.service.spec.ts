import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/standalone';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import type { Trip } from 'model';
import { TripsService } from '../trips.service';

const trip: Trip = {
  id: 'trip-1',
  userId: 'owner',
  title: 'Asia',
  startDate: '2026-12-01',
};

describe(TripsService.name, () => {
  const store = {
    sortedTrips$: of([trip]),
    tripsLoaded$: of(true),
    loadMyTrips: jest.fn(),
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
  };
  const navController = { navigateForward: jest.fn() };
  let service: TripsService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 28, 9));
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeStoreService, useValue: store },
        { provide: NavController, useValue: navController },
      ],
    });
    service = TestBed.inject(TripsService);
  });

  afterEach(() => jest.useRealTimers());

  it('reads the trips from the store', () => {
    expect(service.trips()).toEqual([trip]);
    expect(service.loaded()).toBe(true);
  });

  it('reloads the trips and today on every visit', () => {
    jest.setSystemTime(new Date(2026, 10, 29, 9));

    service.enter();

    expect(store.loadMyTrips).toHaveBeenCalledTimes(1);
    expect(service.today()).toBe('2026-11-29');
  });

  it('hands writes to the store', () => {
    const draft = { title: 'Asia', startDate: '2026-12-02' };

    service.createTrip(draft);
    service.updateTrip({ trip, draft });
    service.deleteTrip('trip-1');

    expect(store.createTrip).toHaveBeenCalledWith(draft);
    expect(store.updateTrip).toHaveBeenCalledWith(trip, draft);
    expect(store.deleteTrip).toHaveBeenCalledWith('trip-1');
  });

  it('opens a trip', () => {
    service.gotoTrip('trip-1');

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'my-trips',
      'trip-1',
    ]);
  });
});
