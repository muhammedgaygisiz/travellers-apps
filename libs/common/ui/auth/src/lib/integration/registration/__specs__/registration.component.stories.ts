import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { RegistrationComponent } from '../../../components/registration/registration.component';

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
