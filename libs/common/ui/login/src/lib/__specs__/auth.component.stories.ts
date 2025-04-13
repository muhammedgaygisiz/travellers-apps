import { LoginComponent } from '../components/login.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Auth',
  component: LoginComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<LoginComponent>;

type Story = StoryObj<LoginComponent>;
export const Primary: Story = {};
