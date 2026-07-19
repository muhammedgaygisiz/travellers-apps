import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RestaurantImageComponent } from '../restaurant-image.component';

addNecessaryIcons();

const restaurantWithImage: Restaurant = {
  name: 'China Wok',
  imagePath: 'assets/demo/bite-demo.png',
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
  },
};
