import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { PublicUser } from 'model';

export const UserActions = createActionGroup({
  source: 'Users',
  events: {
    'Saved public profile': props<{ profile: PublicUser }>(),
    'Loaded Bite Creator': props<{ user: PublicUser }>(),
    'No User for Bite': emptyProps(),
    'Loaded Followers': props<{ users: PublicUser[] }>(),
    'Loaded Followings': props<{ users: PublicUser[] }>(),
    'Error loading Followers': emptyProps(),
    'Error loading Followings': emptyProps(),
    'No User ID provided': emptyProps(),
  },
});
