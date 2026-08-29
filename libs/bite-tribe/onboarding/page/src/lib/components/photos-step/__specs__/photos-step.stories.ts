import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { PhotosStepComponent } from '../photos-step.component';

export default {
  title: 'Pages/Onboarding/Photos Step',
  component: PhotosStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    permission: 'idle',
  },
} as Meta<PhotosStepComponent>;

type Story = StoryObj<PhotosStepComponent>;

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

/** Denial is accepted; the flow stays completable and Bites keep four other position sources. */
export const Denied: Story = {
  args: {
    permission: 'denied',
  },
};

/**
 * No such permission exists on iOS or the web. The assistant filters the step
 * out there, so this state is only ever seen here.
 */
export const Unsupported: Story = {
  args: {
    permission: 'unsupported',
  },
};
