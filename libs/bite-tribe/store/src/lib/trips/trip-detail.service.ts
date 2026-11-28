import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { of, switchMap } from 'rxjs';

/**
 * One trip and its Bites, for the trip page (issue #2354).
 *
 * The trip is looked up among the signed-in user's own trips, so another
 * user's trip id reads as not found rather than as their trip. Its Bites are
 * read whenever the page is entered and whenever they are missing, which is
 * after an edit moved the trip's range.
 */
@Injectable()
export class TripDetailService {
  private readonly store = inject(BiteTribeStoreService);

  private readonly tripId = signal<string | undefined>(undefined);

  /**
   * Set on entering the page. The trip resolves after `enter` returns, so the
   * read waits for it here rather than being skipped when Bites are cached.
   */
  private readonly reloadPending = signal(false);

  readonly loaded = toSignal(this.store.tripsLoaded$, { initialValue: false });

  readonly trip = toSignal(
    toObservable(this.tripId).pipe(
      switchMap((id) => (id ? this.store.tripById$(id) : of(undefined))),
    ),
  );

  readonly bites = toSignal(
    toObservable(this.tripId).pipe(
      switchMap((id) => (id ? this.store.tripBites$(id) : of(undefined))),
    ),
  );

  readonly notFound = computed(() => this.loaded() && !this.trip());

  /**
   * The trip's Bites that have a position, oldest first: the stops of its
   * route. The list shows newest first; the route runs the other way.
   */
  readonly stops = computed(() =>
    [...(this.bites() ?? [])]
      .filter(
        ({ position }) =>
          Number.isFinite(position?.latitude) &&
          Number.isFinite(position?.longitude),
      )
      .reverse(),
  );

  /** Whether there is anything to put on a map. */
  readonly hasRoute = computed(() => this.stops().length > 0);

  /** Each stop's number on the route, from 1 for the oldest, by Bite id. */
  readonly stopNumbers = computed(() =>
    Object.fromEntries(
      this.stops().map((bite, index) => [bite.id, String(index + 1)]),
    ),
  );

  /** True until the Bites are read, or until the trip turns out not to exist. */
  readonly isLoading = computed(() => !this.notFound() && !this.bites());

  constructor() {
    effect(() => {
      const trip = this.trip();

      const bites = this.bites();

      // Untracked, so clearing the flag does not run this again before the
      // Bites it asked for have arrived.
      untracked(() => {
        if (trip && (this.reloadPending() || !bites)) {
          this.reloadPending.set(false);
          this.store.loadTripBites(trip);
        }
      });
    });
  }

  enter(tripId: string): void {
    this.tripId.set(tripId);
    this.reloadPending.set(true);

    if (!this.loaded()) {
      this.store.loadMyTrips();
    }
  }

  /** Reads the Bites again, so one posted since the last visit shows up. */
  reload(): void {
    const trip = this.trip();

    if (trip) {
      this.store.loadTripBites(trip);
    }
  }
}
