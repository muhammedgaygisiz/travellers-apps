import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { NotificationStepComponent } from '../notification-step.component';

export default {
  title: 'Pages/Onboarding/Notification Step',
  component: NotificationStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    permission: 'idle',
  },
} as Meta<NotificationStepComponent>;

type Story = StoryObj<NotificationStepComponent>;

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

/** No OS prompt exists on the web build. */
export const Unsupported: Story = {
  args: {
    permission: 'unsupported',
  },
};
