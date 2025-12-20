import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Bite } from 'model';

export const BiteActions = createActionGroup({
  source: 'BITES',
  events: {
    'Loaded By GPS Position from API': props<{ bites: Bite[] }>(),
    'Loaded By User From API': props<{ bites: Bite[] }>(),
    'Save new bite': props<{ bite: Bite }>(),
    'Save existing bite': props<{ bite: Bite }>(),
    'Saved bite': props<{ bite: Bite }>(),
    'Error saving bite': props<{ bite: Bite }>(),
    'Save new tags': props<{ newTags: string[]; id: string }>(),
    'Cache bite': props<{ bite: Partial<Bite> }>(),
    'Delete bite': props<{ bite: Bite }>(),
    'Loaded bite creator': props<{ biteCreator: any }>(),
    'No public creator for bite': emptyProps(),
  },
});
