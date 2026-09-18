import { applicationConfig, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { AboutPage } from '../about.page';

addNecessaryIcons();

export default {
  title: 'Pages/About',
  component: AboutPage,
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

type Story = StoryObj<AboutPage>;

/**
 * Fixed counts rather than the live ones, because this is a visual reference:
 * the page is baselined by Loki at both a laptop and a phone width, and a
 * number that moved with the database would fail every run for a reason that
 * has nothing to do with the layout.
 */
export const Primary: Story = {
  args: {
    totalNumberBites: 1284,
    totalNumberUsers: 312,
  },
};
