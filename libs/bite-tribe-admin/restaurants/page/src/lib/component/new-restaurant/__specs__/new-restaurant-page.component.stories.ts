import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Restaurant } from 'model';
import { NewRestaurantPageComponent } from '../new-restaurant-page.component';

addNecessaryIcons();

const restaurant: Restaurant = {
  id: '',
  name: 'Trattoria Roma',
  description: 'Cosy family-run Italian restaurant.',
  position: { latitude: 40.85, longitude: 14.26 },
  address: {
    street: 'Via Roma 1',
    postcode: '80100',
    city: 'Napoli',
    country: 'Italy',
  },
  biteIds: ['b1', 'b2'],
  bites: [],
} as Restaurant;

export default {
  title: 'Admin/New Restaurant',
  component: NewRestaurantPageComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: {
    restaurant,
    googlePlaces: [],
    googlePlacesLoading: false,
    placeDetails: undefined,
    placeDetailsLoading: false,
  },
} as Meta<NewRestaurantPageComponent>;

type Story = StoryObj<NewRestaurantPageComponent>;

/**
 * The page at the laptop width Loki baselines it at: form fields and opening
 * hours on the left, map and bite list on the right, which is the two-column
 * layout Ionic's `lg` breakpoint (>= 992px) produces.
 *
 * This was two stories, `TwoColumn` and `Stacked`, each declaring a viewport
 * through `parameters.viewport`. Loki loads `iframe.html?id=...` directly and
 * sizes the browser itself from `configurations` in `loki.config.js`, so the
 * viewport addon never runs and both stories rendered at the configuration's
 * width - the two committed references were byte-identical. Below `lg` the page
 * stacks into one column; that is browsed through the Storybook viewport
 * toolbar rather than baselined, because the admin app is a desktop product
 * (issue #1547).
 */
export const Default: Story = {};
