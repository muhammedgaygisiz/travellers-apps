import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { CountryLeaderboardComponent } from '../country-leaderboard.component';

addNecessaryIcons();

const MONDAY = Date.UTC(2026, 10, 9);
const NEXT_MONDAY = Date.UTC(2026, 10, 16);

const countries = [
  { countryCode: 'CH', biteCount: 41 },
  { countryCode: 'BA', biteCount: 17 },
  { countryCode: 'TR', biteCount: 12 },
  { countryCode: 'IT', biteCount: 8 },
  { countryCode: 'DE', biteCount: 5 },
];

export default {
  title: 'Pages/Country Leaderboard',
  component: CountryLeaderboardComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  args: {
    now: Date.UTC(2026, 10, 14, 9, 30),
  },
} as Meta<CountryLeaderboardComponent>;

type Story = StoryObj<CountryLeaderboardComponent>;

/** Countries by this week's Bites, the top 3 on the podium (issue #2043). */
export const ThisWeek: Story = {
  args: {
    board: 'countries',
    ranking: { board: 'countries', countries, start: MONDAY, end: NEXT_MONDAY },
  },
};

/** Last week's country ranking, frozen and dated. */
export const LastWeek: Story = {
  args: {
    board: 'countriesLastWeek',
    ranking: {
      board: 'countriesLastWeek',
      countries,
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};

/** Every Bite ever posted, by country. */
export const AllTime: Story = {
  args: {
    board: 'countriesAllTime',
    ranking: {
      board: 'countriesAllTime',
      countries: countries.map((c) => ({ ...c, biteCount: c.biteCount * 9 })),
    },
  },
};

/** Two countries this week: #3 stays empty. */
export const TwoCountries: Story = {
  args: {
    board: 'countries',
    ranking: {
      board: 'countries',
      countries: countries.slice(0, 2),
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};

/** Right after the reset, before any Bite of the week has a country. */
export const Empty: Story = {
  args: {
    board: 'countries',
    ranking: {
      board: 'countries',
      countries: [],
      start: MONDAY,
      end: NEXT_MONDAY,
    },
  },
};
