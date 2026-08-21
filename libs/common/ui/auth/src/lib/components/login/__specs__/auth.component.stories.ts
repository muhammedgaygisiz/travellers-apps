import { LoginComponent } from '../login.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Login',
  component: LoginComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'BiteTribe' },
      ],
    }),
  ],
} as Meta<LoginComponent>;

type Story = StoryObj<LoginComponent>;
export const Primary: Story = {};

/**
 * While a sign-in is in flight the header progress bar runs, the submit button
 * locks and reports progress, and the provider buttons lock with it, so several
 * seconds of network wait cannot look like a dropped tap.
 */
export const Pending: Story = {
  args: {
    pending: true,
  },
};

/**
 * A failed sign-in releases the form and keeps the existing error message.
 */
export const Failed: Story = {
  args: {
    loginFailed: true,
  },
};
