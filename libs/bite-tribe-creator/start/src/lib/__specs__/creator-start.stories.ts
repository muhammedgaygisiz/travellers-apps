import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CreatorStart } from '../creator-start';

addNecessaryIcons();

export default {
  title: 'Creator/Start',
  component: CreatorStart,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig()), provideRouter([])],
    }),
  ],
} as Meta<CreatorStart>;

type Story = StoryObj<CreatorStart>;

/** The signed-out landing page: Log In, and Sign Up for a new creator. */
export const Default: Story = {};
