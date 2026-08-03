import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { GpsErrorCardComponent } from '../gps-error-card.component';

addNecessaryIcons();

export default {
  title: 'Components/GPS Error Card',
  component: GpsErrorCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<GpsErrorCardComponent>;

type Story = StoryObj<GpsErrorCardComponent>;

/** The read failed for an unclassified reason, so retrying can still help. */
export const Default: Story = {};

/**
 * The OS is blocking the read. Only the settings page can undo it, so the copy
 * says so and the action names the handoff instead of promising an in-app
 * switch (issue #1183).
 */
export const PermissionDenied: Story = {
  args: {
    permissionState: 'denied',
  },
};

/** Never asked: the OS still has a prompt left, so the wording stays neutral. */
export const PermissionPrompt: Story = {
  args: {
    permissionState: 'prompt',
  },
};
