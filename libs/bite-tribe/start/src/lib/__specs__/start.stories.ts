import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, StoryObj } from '@storybook/angular';
import { StartComponent } from '../start.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';

addNecessaryIcons();

export default {
  title: 'Pages/Start',
  component: StartComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
        provideRouter([]),
      ],
    }),
  ],
};

type Story = StoryObj<StartComponent>;

/** The web start page, which is what a browser renders (issue #1706). */
export const Primary: Story = {};

/**
 * The iOS and Android start page, unchanged by issue #1706. A browser never
 * reaches it on its own, so the story sets the platform input.
 */
export const Native: Story = {
  args: { native: true },
};
