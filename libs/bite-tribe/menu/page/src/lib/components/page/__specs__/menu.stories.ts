import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { MenuPage } from '../menu-page.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { Menu, Restaurant } from 'model';
import { restaurantB64Image } from './restaurant-b64-image';

addNecessaryIcons();

export default {
  title: 'Pages/Menu',
  component: MenuPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<MenuPage>;

type Story = StoryObj<MenuPage>;

/**
 * The menu has not arrived yet. It is its own state rather than the empty one
 * below, which used to stand in for it and told the reader the restaurant has
 * no menu before anything had been read. See GitHub issue #1382.
 */
export const Loading: Story = {
  args: {
    isMenuLoading: true,
    restaurant: {
      image: restaurantB64Image,
      name: 'China Wok',
    } as Restaurant,
  },
};

/**
 * The menu could not be resolved - a timeout, an offline device, or an id that
 * points at nothing. The reader is told so and offered the way back and the
 * read again, instead of a page that looks like a restaurant without a menu.
 */
export const Unavailable: Story = {
  args: {
    isMenuUnavailable: true,
    restaurant: {
      image: restaurantB64Image,
      name: 'China Wok',
    } as Restaurant,
  },
};

/** A menu that loaded and really has no items yet. */
export const Empty: Story = {
  args: {
    restaurant: {
      image: restaurantB64Image,
      name: 'China Wok',
    } as Restaurant,
    menu: { id: 'empty-menu', categories: [] } as unknown as Menu,
  },
};

export const WithMenu: Story = {
  args: {
    ...Empty.args,
    menu: {
      categories: [
        {
          title: 'Pizza',
          subtitle:
            'alle Pizzen mit Gouda-Käse, Tomatensauce und Oregano. ca. 32cm',
          items: [
            {
              name: 'Margharita',
              description: 'Tomatensauce & Käse',
              price: 7,
            },
            {
              name: 'Salami',
              description: 'Salami (Rind)',
              price: 8.5,
              isAvailable: false,
            },
          ],
        },
      ],
    } as unknown as Menu,
  },
};

export const WithDishVariants: Story = {
  args: {
    restaurant: {
      image: restaurantB64Image,
      name: 'Delicious Bites from Moistan',
      position: {
        longitude: 7.004827,
        latitude: 50.9718051,
      },
    } as Restaurant,
    menu: {
      categories: [
        {
          title: 'Toasties & Bagels',
          items: [
            {
              name: "Meat Lover's Toasties",
              description: 'Toast and Cheese',
              price: 0,
              variants: [
                {
                  name: 'with Chicken',
                  price: 5,
                },
                {
                  name: 'with Beef',
                  price: 6,
                },
              ],
            },
            {
              name: 'Vegetarian Bagels',
              description: 'Bagel and Cream Cheese',
              price: 0,
              variants: [
                {
                  name: 'with Pepper',
                  price: 5,
                },
                {
                  name: 'with Tomato',
                  price: 6,
                },
              ],
            },
          ],
        },
        {
          title: 'Kebabs',
          items: [
            {
              name: 'Sandwich',
              description: 'Lettuce, Tomato and Onion',
              price: 0,
              variants: [
                {
                  name: 'with Chicken',
                  price: 5,
                },
                {
                  name: 'with Beef',
                  price: 6,
                },
              ],
            },
            {
              name: 'Plate',
              description: 'Fries or Rice',
              price: 0,
              variants: [
                {
                  name: 'with Chicken',
                  price: 8,
                },
                {
                  name: 'with Beef',
                  price: 9,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as Menu,
  },
};
