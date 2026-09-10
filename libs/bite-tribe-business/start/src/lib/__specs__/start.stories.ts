import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { Start } from '../start';

addNecessaryIcons();

export default {
  title: 'Business/Start',
  component: Start,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig()), provideRouter([])],
    }),
  ],
} as Meta<Start>;

type Story = StoryObj<Start>;

/**
 * The signed-out landing page. Unlike the admin app's it offers Sign Up, since
 * a restaurant registers itself and is granted the `business` role afterwards.
 */
export const Default: Story = {};
