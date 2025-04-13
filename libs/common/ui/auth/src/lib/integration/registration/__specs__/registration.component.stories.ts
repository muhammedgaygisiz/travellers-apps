import { RegistrationComponent } from '../components/registration.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Registration',
  component: RegistrationComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<RegistrationComponent>;

type Story = StoryObj<RegistrationComponent>;

export const Primary: Story = {};
