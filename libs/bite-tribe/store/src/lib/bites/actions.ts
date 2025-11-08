import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const BiteActions = createActionGroup({
  source: 'BITES',
  events: {
    'Loaded from API': props<{ bites: any }>(),
    'Save new bite': props<{ bite: any }>(),
    'Save existing bite': props<{ bite: any }>(),
    'Save new tags': props<{ newTags: string[]; id: string }>(),
    'Cache bite': props<{ bite: any }>(),
    'Delete bite': props<{ bite: any }>(),
    'Loaded bite creator': props<{ biteCreator: any }>(),
    'No public creator for bite': emptyProps(),
  },
});
