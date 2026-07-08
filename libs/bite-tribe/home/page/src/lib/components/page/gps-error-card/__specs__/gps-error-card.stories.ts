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

export const Default: Story = {};
