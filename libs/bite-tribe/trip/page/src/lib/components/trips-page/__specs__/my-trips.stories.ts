import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Trip } from 'model';
import { TripsPage } from '../trips.page';

addNecessaryIcons();

export default {
  title: 'Pages/My Trips',
  component: TripsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  // Pinned, so the ongoing badge does not move with the day the suite runs.
  args: { today: '2026-11-28' },
} as Meta<TripsPage>;

const TRIPS: Trip[] = [
  {
    id: 'upcoming',
    userId: 'user-1',
    title: 'Japan 2027',
    startDate: '2027-03-01',
    endDate: '2027-03-21',
  },
  {
    id: 'ongoing',
    userId: 'user-1',
    title: 'Southeast Asia 2026/2027',
    startDate: '2026-11-01',
  },
  {
    id: 'past',
    userId: 'user-1',
    title: 'Peru',
    startDate: '2025-05-01',
    endDate: '2025-05-20',
  },
];

type Story = StoryObj<TripsPage>;

export const Empty: Story = {
  args: { trips: [], loaded: true },
};

export const WithTrips: Story = {
  args: { trips: TRIPS, loaded: true },
};
