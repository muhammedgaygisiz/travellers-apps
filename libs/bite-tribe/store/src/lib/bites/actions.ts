import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Bite } from 'model';

export const BiteActions = createActionGroup({
  source: 'BITES',
  events: {
    'Loaded By GPS Position from API': props<{ bites: Bite[] }>(),
    // The feed load never answered. It ends the Home loading state the same way
    // a successful load does, so a request that hangs cannot keep the feed under
    // a skeleton (issue #1230).
    'Error loading by GPS position from API': emptyProps(),
    'Loaded By User From API': props<{ bites: Bite[] }>(),
    'Loaded By Bucketlist From API': props<{ bites: Bite[] }>(),
    'Save new bite': emptyProps(),
    'Save existing bite': props<{ bite: Bite }>(),
    'Saved bite': props<{ bite: Bite }>(),
    // The first successful write of a Bite that did not exist before, kept
    // apart from `Saved bite` because that one also carries an edit and every
    // local image-upload state change of a Bite that is already counted. Only a
    // creation moves the signed-in user's `biteCount` aggregate (issue #1310).
    'Created bite': props<{ bite: Bite }>(),
    'Error saving bite': props<{ bite: Bite }>(),
    'Cache bite': props<{ bite: Partial<Bite> }>(),
    // Ends a Bite creation session that was seeded with a prefilled draft (from
    // a menu item or an existing Bite) without saving, so the draft cannot show
    // up in the next, unrelated creation session (issue #1233).
    'Clear cached bite': emptyProps(),
    'Set editing bite': props<{ bite: Partial<Bite> }>(),
    'Delete bite': props<{ bite: Bite }>(),
    'Deleted bite': props<{ bite: Bite }>(),
    'Error deleting bite': props<{ bite: Bite }>(),
    'No public creator for bite': emptyProps(),
    'No bites for bite creator profile': emptyProps(),
    'Loaded Latest from API': props<{ bites: Bite[] }>(),
  },
});
