import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { NetworkErrorBoxComponent } from '../network-error-box.component';

addNecessaryIcons();

export default {
  title: 'Components/Network Error Box',
  component: NetworkErrorBoxComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<NetworkErrorBoxComponent>;

type Story = StoryObj<NetworkErrorBoxComponent>;

export const Default: Story = {};
