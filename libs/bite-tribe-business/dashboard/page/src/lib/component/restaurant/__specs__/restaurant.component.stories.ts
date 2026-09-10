import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { Restaurant } from 'model';
import { RestaurantComponent } from '../restaurant.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const RESTAURANT_IMAGE = 'assets/demo/bite-demo.png';

const trattoria: Restaurant = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  distance: '1240',
  imagePath: RESTAURANT_IMAGE,
  position: { latitude: 40.8518, longitude: 14.2681 },
} as Restaurant;

export default {
  title: 'Business/Restaurant Card',
  component: RestaurantComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: { restaurant: trattoria },
} as Meta<RestaurantComponent>;

type Story = StoryObj<RestaurantComponent>;

/** A saved restaurant: image, name and distance, with nothing to act on. */
export const Default: Story = {};

/** No photo yet, so the card collapses to its details column. */
export const WithoutImage: Story = {
  args: { restaurant: { ...trattoria, imagePath: undefined } },
};

/**
 * A place found nearby that BiteTribe does not hold yet. The card offers to
 * create it, which is the one action that turns it into a restaurant.
 */
export const Unsaved: Story = {
  args: {
    restaurant: {
      ...trattoria,
      id: '',
      name: 'Osteria Vecchia',
      distance: '380',
      imagePath: undefined,
      unsaved: true,
    },
  },
};

/** A long name next to a distance, which is where the header wraps. */
export const LongName: Story = {
  args: {
    restaurant: {
      ...trattoria,
      name: 'Ristorante Pizzeria Da Michele Forcella Napoli',
    },
  },
};
