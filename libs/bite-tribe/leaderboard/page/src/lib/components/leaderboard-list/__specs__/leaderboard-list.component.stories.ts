import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { LeaderboardUser } from 'bite-tribe/leaderboard-data-access';
import { LeaderboardListComponent } from '../leaderboard-list.component';

addNecessaryIcons();

// A fixed week, so the countdown and the dates read the same on every run.
const MONDAY = Date.UTC(2026, 10, 9);
const NEXT_MONDAY = Date.UTC(2026, 10, 16);
const SATURDAY_AFTERNOON = Date.UTC(2026, 10, 14, 9, 30);

const user = (
  userId: string,
  displayName: string,
  biteCount: number,
  city?: string,
): LeaderboardUser => ({
  userId,
  displayName,
  photoUrl: '',
  public: true,
  biteCount,
  ...(city ? { city } : {}),
});

const weekUsers: LeaderboardUser[] = [
  user('ali', 'Ali K.', 12, 'Bern'),
  user('lena', 'Lena M.', 9, 'Zurich'),
  user('sara', 'Sara R.', 7, 'Basel'),
  { ...user('anon', '', 4), public: false },
  user('tom', 'Tom B.', 3, 'Lucerne'),
];

export default {
  title: 'Pages/Leaderboard',
  component: LeaderboardListComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  args: {
    now: SATURDAY_AFTERNOON,
  },
} as Meta<LeaderboardListComponent>;

type Story = StoryObj<LeaderboardListComponent>;

/**
 * The default: the running week, ranked by the Bites created since Monday
 * 00:00 UTC, with the countdown to the reset (issue #2027).
 */
export const ThisWeek: Story = {
  args: {
    board: 'thisWeek',
    ranking: {
      board: 'thisWeek',
      users: weekUsers,
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};

/** Right after the reset: nobody has posted in the new week yet. */
export const ThisWeekEmpty: Story = {
  args: {
    board: 'thisWeek',
    now: MONDAY + 60 * 60 * 1000,
    ranking: {
      board: 'thisWeek',
      users: [],
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};

/** Last week's final standings, frozen at the reset and dated. */
export const LastWeek: Story = {
  args: {
    board: 'lastWeek',
    ranking: {
      board: 'lastWeek',
      users: weekUsers,
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};

/** Every Bite a user ever created, as the leaderboard was before #2027. */
export const AllTime: Story = {
  args: {
    board: 'allTime',
    ranking: {
      board: 'allTime',
      users: [
        user('veteran', 'Mo', 613, 'Bern'),
        user('ali', 'Ali K.', 240, 'Bern'),
        user('lena', 'Lena M.', 98, 'Zurich'),
      ],
    },
  },
};

const likedBites = [
  {
    biteId: 'manti',
    name: 'Mantı',
    imageUrl: '',
    userId: 'ali',
    displayName: 'Ali K.',
    likeCount: 44,
  },
  {
    biteId: 'cevapi',
    name: 'Ćevapi',
    imageUrl: '',
    userId: 'lena',
    displayName: 'Lena M.',
    likeCount: 31,
  },
  {
    biteId: 'burek',
    name: 'Burek',
    imageUrl: '',
    userId: 'ali',
    displayName: 'Ali K.',
    likeCount: 27,
  },
];

/**
 * Bites ranked by the likes they received this week (issue #2028). One
 * creator can hold several places.
 */
export const MostLiked: Story = {
  args: {
    board: 'mostLiked',
    ranking: {
      board: 'mostLiked',
      users: [],
      bites: likedBites,
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};

/** Last week's most-liked Bites, frozen at the reset and dated. */
export const MostLikedLastWeek: Story = {
  args: {
    board: 'mostLikedLastWeek',
    ranking: {
      board: 'mostLikedLastWeek',
      users: [],
      bites: likedBites,
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};
