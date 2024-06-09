import { AuthComponent } from '../components/auth.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Auth',
  component: AuthComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<AuthComponent>;

type Story = StoryObj<AuthComponent>;
export const Primary: Story = {};
