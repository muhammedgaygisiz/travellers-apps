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

const countryCodes = ['AT', 'DE', 'IT', 'FR', 'TR', 'AE', 'TH'];

export const OwnProfile: Story = {
  args: {
    isOwnProfile: true,
    displayName: 'Mo',
    countryCodes,
    autoSpin: false,
  },
};

export const OtherProfile: Story = {
  args: {
    isOwnProfile: false,
    displayName: 'Leela',
    countryCodes: ['JP', 'KR', 'TH', 'VN', 'US', 'MX', 'PE'],
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
