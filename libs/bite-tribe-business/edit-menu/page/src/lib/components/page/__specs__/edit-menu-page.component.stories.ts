import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Menu, Restaurant } from 'model';
import { EditMenuPage } from '../edit-menu-page.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const RESTAURANT_IMAGE = 'assets/demo/bite-demo.png';

const trattoria: Restaurant = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  imagePath: RESTAURANT_IMAGE,
  position: { latitude: 40.8518, longitude: 14.2681 },
  menuId: 'menu-trattoria',
} as Restaurant;

const menu: Menu = {
  id: 'menu-trattoria',
  restaurantId: trattoria.id,
  categories: [
    {
      id: 'category-antipasti',
      title: 'Antipasti',
      subtitle: 'To share, or not',
      items: [
        {
          id: 'item-bruschetta',
          name: 'Bruschetta al pomodoro',
          description: 'Grilled sourdough, datterini, basil.',
          price: 6.5,
          isAvailable: true,
        },
        {
          id: 'item-burrata',
          name: 'Burrata pugliese',
          description: 'With Cetara anchovies and taralli.',
          ingredients: 'Burrata, anchovy, olive oil',
          price: 11,
          isAvailable: true,
        },
      ],
    },
    {
      id: 'category-pizze',
      title: 'Pizze',
      items: [
        {
          id: 'item-margherita',
          name: 'Margherita',
          description: 'San Marzano, fior di latte, basil.',
          price: 9,
          isAvailable: true,
          variants: [
            {
              id: 'variant-margherita-bufala',
              name: 'Margherita con bufala',
              description: 'Buffalo mozzarella instead of fior di latte.',
              price: 12,
              isAvailable: true,
            },
          ],
        },
        {
          id: 'item-diavola',
          name: 'Diavola',
          description: 'Spicy salame, chilli, oregano.',
          notes: 'Hot.',
          price: 11.5,
          isAvailable: false,
        },
      ],
      extrasBlock: {
        description: 'Add to any pizza',
        extras: [
          { name: 'Extra mozzarella', price: 2 },
          { name: "'Nduja", price: 2.5 },
        ],
      },
    },
  ],
};

export default {
  title: 'Business/Edit Menu',
  component: EditMenuPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { restaurant: trattoria, menu },
} as Meta<EditMenuPage>;

type Story = StoryObj<EditMenuPage>;

/**
 * A populated menu: two categories, an item carrying a variant, an unavailable
 * item, and a category with an extras block.
 */
export const Default: Story = {};

/** A menu that has just been created and holds no category yet. */
export const EmptyMenu: Story = {
  args: {
    menu: { id: 'menu-osteria', restaurantId: trattoria.id, categories: [] },
  },
};
