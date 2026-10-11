import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { FollowSuggestion, PublicUser } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { FollowersListComponent } from '../followers-list.component';

addNecessaryIcons();

/** No photos, so the references do not depend on the network. */
const followSuggestions: FollowSuggestion[] = [
  { userId: 'ana', displayName: 'Ana', biteCount: 12, reason: 'nearby' },
  { userId: 'ben', displayName: 'Ben', biteCount: 4, reason: 'curated' },
  { userId: 'chloe', displayName: 'Chloé', biteCount: 31, reason: 'active' },
];

const me = 'me';

/** People the user already follows, without photos for the same reason. */
const followed: PublicUser[] = [
  {
    userId: 'dana',
    displayName: 'Dana',
    city: 'Lisbon',
    email: '',
    photoUrl: '',
    public: true,
  },
  {
    userId: 'eli',
    displayName: 'Eli',
    city: 'Berne',
    email: '',
    photoUrl: '',
    public: true,
  },
];

export default {
  title: 'Pages/Followers List',
  component: FollowersListComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<FollowersListComponent>;

type Story = StoryObj<FollowersListComponent>;

/**
 * The signed-in user's own empty Following list, which offers people to
 * follow under the centred empty message (GitHub issue #1708).
 */
export const EmptyFollowingWithSuggestions: Story = {
  args: {
    users: [],
    type: 'following',
    loggedInUserId: me,
    profileOwnerid: me,
    followSuggestions,
  },
};

/**
 * A user who already follows people is still offered more, below the list
 * and in line with its rows (GitHub issue #1708).
 */
export const FollowingWithSuggestions: Story = {
  args: {
    users: followed,
    type: 'following',
    loggedInUserId: me,
    profileOwnerid: me,
    followSuggestions,
  },
};

/** An empty Followers list says so and suggests nobody. */
export const EmptyFollowers: Story = {
  args: {
    users: [],
    type: 'followers',
    loggedInUserId: me,
    profileOwnerid: me,
  },
};
