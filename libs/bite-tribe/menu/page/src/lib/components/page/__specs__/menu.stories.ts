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
        { provide: APP_TITLE, useValue: 'BiteTribe' },
      ],
    }),
  ],
} as Meta<MenuPage>;

type Story = StoryObj<MenuPage>;
export const Empty: Story = {
  args: {
    restaurant: {
      image: restaurantB64Image,
      name: 'China Wok',
    } as Restaurant,
  },
};

export const withMenu: Story = {
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

export const withDishVariants: Story = {
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
