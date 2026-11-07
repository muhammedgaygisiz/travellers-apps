import { applicationConfig, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { AboutPage } from '../about.page';

addNecessaryIcons();

export default {
  title: 'Pages/About',
  component: AboutPage,
  // The page is taller than the laptop viewport; see LokiSettleOptions in
  // apps/storybook-host/.storybook/loki-getstories-shim.ts (issue #1893).
  parameters: { lokiSettle: { resetScroll: true } },
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

/**
 * The globe of every country with a Bite (GitHub issue #1893), held still so
 * the reference does not depend on where the spin happened to stop.
 */
export const WithBiteCountries: Story = {
  args: {
    ...Primary.args,
    biteCountryCodes: ['DE', 'TR', 'IT', 'HU', 'SK', 'JP', 'US', 'BR'],
    autoSpin: false,
  },
};
