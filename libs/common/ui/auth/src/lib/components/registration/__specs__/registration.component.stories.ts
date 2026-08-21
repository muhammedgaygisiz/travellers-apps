import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { RegistrationComponent } from '../../../components/registration/registration.component';

addNecessaryIcons();

export default {
  title: 'Pages/Email Registration',
  component: RegistrationComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<RegistrationComponent>;

type Story = StoryObj<RegistrationComponent>;

export const Primary: Story = {};

/**
 * While registration is in flight the header progress bar runs and the submit
 * button locks and reports progress, so a slow transition into onboarding
 * cannot look like a dropped tap.
 */
export const Pending: Story = {
  args: {
    pending: true,
  },
};
