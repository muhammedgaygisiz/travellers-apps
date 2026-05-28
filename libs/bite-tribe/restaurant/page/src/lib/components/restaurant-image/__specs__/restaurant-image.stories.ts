import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RestaurantImageComponent } from '../restaurant-image.component';

addNecessaryIcons();

const restaurantWithImage: Restaurant = {
  name: 'China Wok',
  imagePath:
    'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
} as Restaurant;

const restaurantWithoutImage: Restaurant = {
  name: 'Unverified Place',
} as Restaurant;

export default {
  title: 'Components/Restaurant Image',
  component: RestaurantImageComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<RestaurantImageComponent>;

type Story = StoryObj<RestaurantImageComponent>;

export const imageLoaded: Story = {
  args: {
    restaurant: restaurantWithImage,
    skipLoadingState: true,
  },
};

export const notVerifiedRestaurant: Story = {
  args: {
    restaurant: restaurantWithoutImage,
    skipLoadingState: true,
  },
};

export const loadingSkeleton: Story = {
  args: {
    restaurant: restaurantWithImage,
    skipLoadingState: false,
  },
};

export const loadingSkeletonWithoutImage: Story = {
  args: {
    restaurant: restaurantWithoutImage,
    skipLoadingState: false,
  },
};
