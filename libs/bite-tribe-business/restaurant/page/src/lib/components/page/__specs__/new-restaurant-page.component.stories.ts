import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, getIonicConfig } from 'utils';
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
  title: 'Pages/New Restaurant',
  component: NewRestaurantPageComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig()), provideRouter([])],
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
 * Two-column layout at the Ionic `lg` breakpoint (>= 992px): form fields and
 * opening hours on the left, map and bite list on the right.
 */
export const TwoColumn: Story = {
  parameters: {
    viewport: {
      viewports: {
        desktop: {
          name: 'Desktop',
          styles: { width: '1200px', height: '900px' },
          type: 'desktop',
        },
      },
      defaultViewport: 'desktop',
    },
  },
};

/**
 * Stacked single-column layout below `lg`: form fields, then opening hours,
 * then map, then bites.
 */
export const Stacked: Story = {
  parameters: {
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
      },
      defaultViewport: 'mobile',
    },
  },
};
