import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { WorldComponent } from '../world.component';

addNecessaryIcons();

/** The countries a user has Bites in, on a globe (GitHub issue #1787). */
export default {
  title: 'Pages/World',
  component: WorldComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<WorldComponent>;

type Story = StoryObj<WorldComponent>;

/**
 * Flat, straight-edged flags only: emblems and curves render differently
 * across Chrome builds and fail the visual run in CI.
 */
const countryCodes = ['AT', 'DE', 'IT', 'FR', 'NL', 'PL', 'TH'];

export const OwnProfile: Story = {
  args: {
    isOwnProfile: true,
    displayName: 'Mo',
    countryCodes,
    biteCounts: { AT: 12, DE: 3, IT: 4, FR: 1, NL: 6, PL: 2, TH: 9 },
    autoSpin: false,
  },
};

export const OtherProfile: Story = {
  args: {
    isOwnProfile: false,
    displayName: 'Leela',
    countryCodes: ['JP', 'TH', 'ID', 'NG', 'CO', 'PL'],
    biteCounts: { JP: 14, TH: 7, ID: 3, NG: 2, CO: 4, PL: 1 },
    autoSpin: false,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    isOwnProfile: true,
    countryCodes: [],
    autoSpin: false,
  },
};

/** The Bites are still being counted: the rows show no numbers yet. */
export const CountingBites: Story = {
  args: {
    ...OwnProfile.args,
    biteCounts: undefined,
  },
};
