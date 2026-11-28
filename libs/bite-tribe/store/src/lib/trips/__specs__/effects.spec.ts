import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { TripApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import type { Bite, Trip } from 'model';
import { firstValueFrom, Observable, of } from 'rxjs';
import { TripActions } from '../actions';
import { TripEffects } from '../effects';

const trip: Trip = {
  id: 'trip-1',
  userId: 'owner',
  title: 'Asia',
  startDate: '2026-12-01',
};
const draft = { title: 'Asia', startDate: '2026-12-01' };
const failure = new Error('permission-denied');

describe(TripEffects.name, () => {
  let actions$: Observable<Action>;
  let effects: TripEffects;
  const api = {
    loadMyTrips: jest.fn(),
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
    loadTripBites: jest.fn(),
  };
  const errorHandler = { handleError: jest.fn() };
  const analytics = { logEvent: jest.fn() };
  const toast = { present: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        TripEffects,
        provideMockActions(() => actions$),
        { provide: TripApiService, useValue: api },
        { provide: ErrorHandler, useValue: errorHandler },
        { provide: AnalyticsService, useValue: analytics },
        { provide: ToastService, useValue: toast },
      ],
    });
    effects = TestBed.inject(TripEffects);
  });

  it('loads the trips', async () => {
    api.loadMyTrips.mockResolvedValue([trip]);
    actions$ = of(TripActions.loadMyTrips());

    expect(await firstValueFrom(effects.loadMyTrips$)).toEqual(
      TripActions.loadedMyTrips({ trips: [trip] }),
    );
  });

  it('reports a failed load', async () => {
    api.loadMyTrips.mockRejectedValue(failure);
    actions$ = of(TripActions.loadMyTrips());

    expect(await firstValueFrom(effects.loadMyTrips$)).toEqual(
      TripActions.loadMyTripsFailed(),
    );
    expect(errorHandler.handleError).toHaveBeenCalledWith(failure);
  });

  it('creates a trip', async () => {
    api.createTrip.mockResolvedValue(trip);
    actions$ = of(TripActions.createTrip({ draft }));

    expect(await firstValueFrom(effects.createTrip$)).toEqual(
      TripActions.createdTrip({ trip }),
    );
    expect(api.createTrip).toHaveBeenCalledWith(draft);
  });

  it('reports a failed create rather than claiming success', async () => {
    api.createTrip.mockRejectedValue(failure);
    actions$ = of(TripActions.createTrip({ draft }));

    expect(await firstValueFrom(effects.createTrip$)).toEqual(
      TripActions.createTripFailed(),
    );
  });

  it('updates a trip, then reads the trips back', async () => {
    api.updateTrip.mockResolvedValue(undefined);
    actions$ = of(TripActions.updateTrip({ trip, draft }));

    expect(await firstValueFrom(effects.updateTrip$)).toEqual(
      TripActions.updatedTrip({ tripId: 'trip-1' }),
    );

    actions$ = of(TripActions.updatedTrip({ tripId: 'trip-1' }));
    expect(await firstValueFrom(effects.reloadAfterUpdate$)).toEqual(
      TripActions.loadMyTrips(),
    );
  });

  it('reports a failed update', async () => {
    api.updateTrip.mockRejectedValue(failure);
    actions$ = of(TripActions.updateTrip({ trip, draft }));

    expect(await firstValueFrom(effects.updateTrip$)).toEqual(
      TripActions.updateTripFailed(),
    );
  });

  it('deletes a trip', async () => {
    api.deleteTrip.mockResolvedValue(undefined);
    actions$ = of(TripActions.deleteTrip({ tripId: 'trip-1' }));

    expect(await firstValueFrom(effects.deleteTrip$)).toEqual(
      TripActions.deletedTrip({ tripId: 'trip-1' }),
    );
  });

  it('reports a failed delete', async () => {
    api.deleteTrip.mockRejectedValue(failure);
    actions$ = of(TripActions.deleteTrip({ tripId: 'trip-1' }));

    expect(await firstValueFrom(effects.deleteTrip$)).toEqual(
      TripActions.deleteTripFailed(),
    );
  });

  it("loads a trip's Bites", async () => {
    const bites = [{ id: 'bite-1' } as Bite];
    api.loadTripBites.mockResolvedValue(bites);
    actions$ = of(TripActions.loadTripBites({ trip }));

    expect(await firstValueFrom(effects.loadTripBites$)).toEqual(
      TripActions.loadedTripBites({ tripId: 'trip-1', bites }),
    );
  });

  it('reports a failed Bite load for that trip', async () => {
    api.loadTripBites.mockRejectedValue(failure);
    actions$ = of(TripActions.loadTripBites({ trip }));

    expect(await firstValueFrom(effects.loadTripBites$)).toEqual(
      TripActions.loadTripBitesFailed({ tripId: 'trip-1' }),
    );
  });

  it.each([
    [TripActions.createdTrip({ trip }), AnalyticsEvent.TripCreated],
    [TripActions.updatedTrip({ tripId: 'trip-1' }), AnalyticsEvent.TripUpdated],
    [TripActions.deletedTrip({ tripId: 'trip-1' }), AnalyticsEvent.TripDeleted],
  ])('logs %p once it is stored', async (action, event) => {
    actions$ = of(action);

    await firstValueFrom(effects.logWrites$);

    expect(analytics.logEvent).toHaveBeenCalledWith(event);
  });

  it.each([
    [TripActions.createTripFailed(), 'trip-save-failed'],
    [TripActions.updateTripFailed(), 'trip-save-failed'],
    [TripActions.deleteTripFailed(), 'trip-delete-failed'],
  ])('tells the user about %p', async (action, messageKey) => {
    actions$ = of(action);

    await firstValueFrom(effects.reportFailedWrites$);

    expect(toast.present).toHaveBeenCalledWith({
      messageKey,
      outcome: 'failure',
    });
  });
});
