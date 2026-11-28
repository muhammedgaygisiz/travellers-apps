import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Bite, Trip, TripDraft } from 'model';

/**
 * Every write reports success or failure as its own action, so a page can tell
 * the user only once the write has settled (issue #2352).
 */
export const TripActions = createActionGroup({
  source: 'TRIP',
  events: {
    'Load My Trips': emptyProps(),
    'Loaded My Trips': props<{ trips: Trip[] }>(),
    'Load My Trips Failed': emptyProps(),
    'Create Trip': props<{ draft: TripDraft }>(),
    'Created Trip': props<{ trip: Trip }>(),
    'Create Trip Failed': emptyProps(),
    'Update Trip': props<{ trip: Trip; draft: TripDraft }>(),
    'Updated Trip': props<{ tripId: string }>(),
    'Update Trip Failed': emptyProps(),
    'Delete Trip': props<{ tripId: string }>(),
    'Deleted Trip': props<{ tripId: string }>(),
    'Delete Trip Failed': emptyProps(),
    'Load Trip Bites': props<{ trip: Trip }>(),
    'Loaded Trip Bites': props<{ tripId: string; bites: Bite[] }>(),
    'Load Trip Bites Failed': props<{ tripId: string }>(),
  },
});
