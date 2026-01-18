import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Bite } from 'model';

export const BiteActions = createActionGroup({
  source: 'BITES',
  events: {
    'Loaded By GPS Position from API': props<{ bites: Bite[] }>(),
    'Loaded By User From API': props<{ bites: Bite[] }>(),
    'Loaded By Bucketlist From API': props<{ bites: Bite[] }>(),
    'Save new bite': props<{ bite: Bite }>(),
    'Save existing bite': props<{ bite: Bite }>(),
    'Saved bite': props<{ bite: Bite }>(),
    'Error saving bite': props<{ bite: Bite }>(),
    'Cache bite': props<{ bite: Partial<Bite> }>(),
    'Set editing bite': props<{ bite: Partial<Bite> }>(),
    'Delete bite': props<{ bite: Bite }>(),
    'Deleted bite': props<{ bite: Bite }>(),
    'Error deleting bite': props<{ bite: Bite }>(),
    'Loaded bite creator': props<{ biteCreator: any }>(),
    'No public creator for bite': emptyProps(),
    'No bites for bite creator profile': emptyProps(),
    'Loaded Latest from API': props<{ bites: Bite[] }>(),
  },
});
