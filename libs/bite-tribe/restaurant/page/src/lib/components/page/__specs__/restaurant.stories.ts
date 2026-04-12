import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { RestaurantComponent } from '../restaurant.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, Like, Restaurant } from 'model';
import { restaurantB64Image } from './restaurant-b64-image';

addNecessaryIcons();

export default {
  title: 'Pages/Restaurant',
  component: RestaurantComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<RestaurantComponent>;

type Story = StoryObj<RestaurantComponent>;
export const unregistered: Story = {
  args: {
    bite: {
      place: 'Einstein au jardin',
      distance: '0.6',
      position: {
        longitude: 7.452407777309418,
        latitude: 46.94654339581695,
      },
    } as Bite,
    bites: [
      {
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        name: 'Botanic Breeze',
        place: 'Einstein au Jardin',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
        distance: '0.6',
        price: '9',
        currency: 'CHF',
      } as unknown as Bite,
      {
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2FjYmma48ToHXcsb3z8NpV%2F74e139dd-86f2-450c-bfd5-e9f974f0c1bf.jpg?alt=media&token=a3ae7571-8247-474a-acde-ad46e286890a',
        name: 'Aperol Spritz',
        place: 'Einstein au Jardin',
        distance: '0.6',
        price: '11',
        currency: 'CHF',
      } as unknown as Bite,
    ],
  },
};

export const unregisteredWithoutBites: Story = {
  args: {
    ...unregistered.args,
    bites: [],
  },
};

export const registered: Story = {
  args: {
    bites: [...(unregistered.args?.bites || [])],
    restaurant: {
      name: 'China Wok',
      position: {
        longitude: 7.004827,
        latitude: 50.9718051,
      },
      image: restaurantB64Image,
      menuId: '/menus/sDI5mifuubvsXenArKEu',
      id: '9cmTIf4jMX1NmG6FjsuW',
      distance: '449.28',
    },
  },
};

export const registeredWithSocialMediaLinks: Story = {
  args: {
    ...registered.args,
    restaurant: {
      ...registered.args?.restaurant,
      socialMediaLinks: [
        { network: 'facebook', url: 'https://www.facebook.com' },
        { network: 'google', url: 'https://www.instagram.com' },
      ],
    } as unknown as Restaurant,
    bites: [...(registered.args?.bites || [])],
  },
};
