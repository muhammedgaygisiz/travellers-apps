import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { LocationStepComponent } from '../location-step.component';

export default {
  title: 'Pages/Onboarding/Location Step',
  component: LocationStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    permission: 'idle',
    homeCity: '',
    isPublicProfile: false,
  },
} as Meta<LocationStepComponent>;

type Story = StoryObj<LocationStepComponent>;

/** The value explanation, shown before the OS prompt is triggered. */
export const BeforePrompt: Story = {};

export const Requesting: Story = {
  args: {
    permission: 'requesting',
  },
};

export const Granted: Story = {
  args: {
    permission: 'granted',
  },
};

/** Denial is accepted; the flow stays completable. */
export const Denied: Story = {
  args: {
    permission: 'denied',
  },
};

/** No OS prompt of our own on the web build; the browser asks on first read. */
export const Unsupported: Story = {
  args: {
    permission: 'unsupported',
  },
};

/** A returning user sees the home city already on their profile (issue #1271). */
export const WithHomeCity: Story = {
  args: {
    permission: 'granted',
    homeCity: 'Bern',
  },
};

/** A public profile shows the home city to everyone, and says so. */
export const PublicProfileHomeCity: Story = {
  args: {
    permission: 'granted',
    homeCity: 'Bern',
    isPublicProfile: true,
  },
};
