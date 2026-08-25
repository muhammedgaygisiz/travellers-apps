import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { RestaurantComponent } from '../restaurant.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, Like, Restaurant } from 'model';
import { restaurantB64Image } from './restaurant-b64-image';

addNecessaryIcons();

export default {
  title: 'Pages/Restaurant/Verified Restaurant',
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

const verifiedBites: Bite[] = [
  {
    imagePath: 'assets/demo/bite-demo.png',
    name: 'Botanic Breeze',
    place: 'Einstein au Jardin',
    rating: 3,
    likes: [{ likeType: 'thumbup' } as Like],
    distance: '0.6',
    price: '9',
    currency: 'CHF',
  } as unknown as Bite,
  {
    imagePath: 'assets/demo/bite-demo.png',
    name: 'Aperol Spritz',
    place: 'Einstein au Jardin',
    distance: '0.6',
    price: '11',
    currency: 'CHF',
  } as unknown as Bite,
];

const verifiedRestaurant = {
  name: 'China Wok',
  position: {
    longitude: 7.004827,
    latitude: 50.9718051,
  },
  image: restaurantB64Image,
  menuId: '/menus/sDI5mifuubvsXenArKEu',
  id: '9cmTIf4jMX1NmG6FjsuW',
  distance: '449.28',
};

export const Registered: Story = {
  args: {
    bites: [...verifiedBites],
    restaurant: verifiedRestaurant,
  },
};

export const RegisteredWithSocialMediaLinks: Story = {
  args: {
    ...Registered.args,
    restaurant: {
      ...Registered.args?.restaurant,
      socialMediaLinks: [
        { network: 'facebook', url: 'https://www.facebook.com' },
        { network: 'google', url: 'https://www.google.com' },
      ],
    } as unknown as Restaurant,
    bites: [...(Registered.args?.bites || [])],
  },
};

export const FullMaintained: Story = {
  args: {
    bites: [
      {
        ...(Registered.args?.bites?.[0] || {}),
        tags: ['cocktail', 'refreshing', 'non-alcoholic'],
      },
      {
        ...(Registered.args?.bites?.[1] || {}),
        tags: ['cocktail', 'aperitif', 'summer'],
      },
    ] as Bite[],
    restaurant: {
      ...Registered.args?.restaurant,
      description:
        'China Wok is a cozy family-run restaurant serving authentic Cantonese and Sichuan dishes. From hand-pulled noodles to dim sum, every dish is prepared fresh daily with high-quality ingredients. Perfect for a relaxed lunch or a lively dinner with friends.',
      address: {
        street: 'Schildergasse 12',
        postcode: '50667',
        city: 'Cologne',
        country: 'Germany',
      },
      socialMediaLinks: [
        { network: 'facebook', url: 'https://www.facebook.com' },
        { network: 'instagram', url: 'https://www.instagram.com' },
        { network: 'google', url: 'https://www.google.com' },
        { network: 'apple', url: 'https://www.apple.com' },
      ],
      openingHours: [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '11:30', to: '22:00' }],
        },
        {
          day: 'tuesday',
          isOpen: true,
          timeRanges: [{ from: '11:30', to: '22:00' }],
        },
        {
          day: 'wednesday',
          isOpen: true,
          timeRanges: [{ from: '11:30', to: '22:00' }],
        },
        {
          day: 'thursday',
          isOpen: true,
          timeRanges: [{ from: '11:30', to: '22:00' }],
        },
        {
          day: 'friday',
          isOpen: true,
          timeRanges: [
            { from: '11:30', to: '15:00' },
            { from: '17:00', to: '23:00' },
          ],
        },
        {
          day: 'saturday',
          isOpen: true,
          timeRanges: [{ from: '12:00', to: '23:00' }],
        },
        {
          day: 'sunday',
          isOpen: false,
          timeRanges: [],
        },
      ],
    } as unknown as Restaurant,
  },
};
