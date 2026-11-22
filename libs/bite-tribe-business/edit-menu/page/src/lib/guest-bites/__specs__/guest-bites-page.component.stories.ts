import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite, Menu, Restaurant } from 'model';
import { GuestBitesPage } from '../guest-bites-page.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const PHOTO = 'assets/demo/bite-demo.png';

const trattoria = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  position: { latitude: 40.8518, longitude: 14.2681 },
  menuId: 'menu-trattoria',
} as Restaurant;

const menu: Menu = {
  id: 'menu-trattoria',
  restaurantId: trattoria.id,
  categories: [
    {
      id: 'category-pasta',
      title: 'Pasta',
      items: [
        {
          id: 'item-carbonara',
          name: 'Spaghetti Carbonara',
          description: '',
          price: 15,
        },
        { id: 'item-cacio', name: 'Cacio e pepe', description: '', price: 13 },
      ],
    },
    {
      id: 'category-pizze',
      title: 'Pizze',
      items: [
        {
          id: 'item-margherita',
          name: 'Margherita',
          description: '',
          price: 0,
          variants: [
            { id: 'variant-small', name: 'Small', description: '', price: 9 },
            { id: 'variant-large', name: 'Large', description: '', price: 13 },
          ],
        },
      ],
    },
  ],
};

const bites = [
  {
    id: 'bite-carbonara',
    name: 'spaghetti carbonara',
    rating: 4,
    imagePath: PHOTO,
    createdAt: '2026-11-12T19:30:00.000Z',
  },
  {
    id: 'bite-carbonara-long',
    name: 'Spaghetti alla carbonara',
    rating: 5,
    createdAt: '2026-11-09T20:10:00.000Z',
  },
  {
    id: 'bite-espresso',
    name: 'Espresso',
    rating: 3,
    createdAt: '2026-11-02T13:00:00.000Z',
  },
] as Bite[];

export default {
  title: 'Business/Guest Bites',
  component: GuestBitesPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { restaurant: trattoria, menu, bites },
} as Meta<GuestBitesPage>;

type Story = StoryObj<GuestBitesPage>;

/**
 * Guests' Bites linked to no dish yet (GitHub issue #2216): one whose name
 * matches a dish, with Link, and two that match nothing.
 */
export const Default: Story = {};

/** Every Bite is linked or marked as not on the menu. */
export const AllLinked: Story = {
  args: { bites: [] },
};
