import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { PublicUser } from 'model';

export const UserActions = createActionGroup({
  source: 'Users',
  events: {
    'Saved public profile': props<{ profile: PublicUser }>(),
    'Loaded Bite Creator': props<{ user: PublicUser }>(),
    'No User for Bite': emptyProps(),
  },
});
