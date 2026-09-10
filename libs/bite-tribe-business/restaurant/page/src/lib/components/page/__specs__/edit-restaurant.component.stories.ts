import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DaySchedule, Restaurant } from 'model';
import { EditRestaurantComponent } from '../edit-restaurant.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const RESTAURANT_IMAGE = 'assets/demo/bite-demo.png';

const openingHours: DaySchedule[] = [
  { day: 'monday', isOpen: false, timeRanges: [] },
  {
    day: 'tuesday',
    isOpen: true,
    timeRanges: [{ from: '12:00', to: '15:00' }],
  },
  {
    day: 'wednesday',
    isOpen: true,
    timeRanges: [{ from: '12:00', to: '15:00' }],
  },
  {
    day: 'thursday',
    isOpen: true,
    timeRanges: [
      { from: '12:00', to: '15:00' },
      { from: '18:00', to: '23:00' },
    ],
  },
  {
    day: 'friday',
    isOpen: true,
    timeRanges: [{ from: '18:00', to: '23:30' }],
  },
  {
    day: 'saturday',
    isOpen: true,
    timeRanges: [{ from: '18:00', to: '23:30' }],
  },
  { day: 'sunday', isOpen: false, timeRanges: [] },
];

const trattoria: Restaurant = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  description: 'Cosy family-run Italian restaurant, wood-fired since 1974.',
  imagePath: RESTAURANT_IMAGE,
  position: { latitude: 40.8518, longitude: 14.2681 },
  address: {
    street: 'Via Roma 1',
    postcode: '80100',
    city: 'Napoli',
    country: 'Italy',
  },
  menuId: 'menu-trattoria',
  openingHours,
  socialMediaLinks: [
    { network: 'instagram', url: 'https://instagram.com/trattoria-roma' },
    { network: 'facebook', url: 'https://facebook.com/trattoria-roma' },
  ],
} as Restaurant;

export default {
  title: 'Business/Edit Restaurant',
  component: EditRestaurantComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { restaurant: trattoria },
} as Meta<EditRestaurantComponent>;

type Story = StoryObj<EditRestaurantComponent>;

/**
 * A restaurant with everything filled in: photo, social links, address,
 * opening hours across two service windows, and a menu to edit.
 */
export const Default: Story = {};

/**
 * A restaurant an operator has just handed over. There is no photo, no social
 * link, no schedule and no menu, so every affordance is the empty one - which
 * is the state a new owner actually meets.
 */
export const Empty: Story = {
  args: {
    restaurant: {
      id: 'restaurant-new',
      name: 'Osteria Vecchia',
      position: { latitude: 40.8395, longitude: 14.2529 },
    } as Restaurant,
  },
};

/** A menu already exists, but the rest of the profile is still unfinished. */
export const WithMenuOnly: Story = {
  args: {
    restaurant: {
      id: 'restaurant-new',
      name: 'Osteria Vecchia',
      position: { latitude: 40.8395, longitude: 14.2529 },
      menuId: 'menu-osteria',
    } as Restaurant,
  },
};
