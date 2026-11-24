import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Restaurant } from 'model';
import { RestaurantOverviewComponent } from '../restaurant-overview.component';

addNecessaryIcons();

const trattoria: Restaurant = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  description: 'Cosy family-run Italian restaurant, wood-fired since 1974.',
  imagePath: 'assets/demo/bite-demo.png',
  categories: ['restaurant', 'fine-dining'],
  position: { latitude: 40.8518, longitude: 14.2681 },
  address: {
    street: 'Via Roma 1',
    postcode: '80100',
    city: 'Napoli',
    country: 'Italy',
  },
  menuId: 'menu-trattoria',
  menuReviewedAtTimestamp: 1,
  openingHours: [
    { day: 'monday', isOpen: false, timeRanges: [] },
    {
      day: 'tuesday',
      isOpen: true,
      timeRanges: [{ from: '12:00', to: '22:00' }],
    },
    {
      day: 'wednesday',
      isOpen: true,
      timeRanges: [{ from: '12:00', to: '22:00' }],
    },
    {
      day: 'thursday',
      isOpen: true,
      timeRanges: [{ from: '12:00', to: '22:00' }],
    },
    {
      day: 'friday',
      isOpen: true,
      timeRanges: [{ from: '12:00', to: '22:00' }],
    },
    {
      day: 'saturday',
      isOpen: true,
      timeRanges: [{ from: '12:00', to: '22:00' }],
    },
    { day: 'sunday', isOpen: false, timeRanges: [] },
  ],
  socialMediaLinks: [
    { network: 'instagram', url: 'https://instagram.com/trattoria-roma' },
    { network: 'facebook', url: 'https://facebook.com/trattoria-roma' },
  ],
  facilities: { genderNeutralRestroom: true },
  tableOrdering: { enabled: false, timeZone: 'Europe/Rome' },
} as Restaurant;

export default {
  title: 'Business/Restaurant Overview',
  component: RestaurantOverviewComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { restaurant: trattoria },
} as Meta<RestaurantOverviewComponent>;

type Story = StoryObj<RestaurantOverviewComponent>;

/**
 * Everything is filled in, so there is no setup progress: each row shows what
 * the section holds and opens it (GitHub issue #2183).
 */
export const SetUp: Story = {};

/** Ordering at the table listed, but not offered yet (#2307). */
export const TableOrderingComingSoon: Story = {
  args: { tableOrderingAvailable: false },
};

/**
 * A restaurant an operator has just handed over: the progress says what to do
 * next, and every row it still counts is marked "Not set yet".
 */
export const NewRestaurant: Story = {
  args: {
    restaurant: {
      id: 'restaurant-new',
      name: 'Osteria Vecchia',
      position: { latitude: 40.8395, longitude: 14.2529 },
      address: { street: 'Via Toledo 12', city: 'Napoli' },
    } as Restaurant,
  },
};

/**
 * Guests' Bites waiting for a link to a dish (GitHub issue #2216): the count
 * on the Guest Bites button.
 */
export const GuestBitesToLink: Story = {
  args: { guestBitesToLink: 4 },
};
