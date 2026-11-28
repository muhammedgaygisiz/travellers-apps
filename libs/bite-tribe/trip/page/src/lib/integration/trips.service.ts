import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { tripDateOf } from 'model';
import type { Trip, TripDraft } from 'model';

@Injectable({ providedIn: 'root' })
export class TripsService {
  private readonly store = inject(BiteTribeStoreService);

  readonly trips = toSignal(this.store.sortedTrips$, {
    initialValue: [] as Trip[],
  });
  readonly loaded = toSignal(this.store.tripsLoaded$, { initialValue: false });

  /** Re-read on every visit, so a trip that has just started reads as ongoing. */
  readonly today = signal(tripDateOf(new Date()));

  enter(): void {
    this.today.set(tripDateOf(new Date()));
    this.store.loadMyTrips();
  }

  createTrip(draft: TripDraft): void {
    this.store.createTrip(draft);
  }

  updateTrip({ trip, draft }: { trip: Trip; draft: TripDraft }): void {
    this.store.updateTrip(trip, draft);
  }

  deleteTrip(tripId: string): void {
    this.store.deleteTrip(tripId);
  }
}
