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

/**
 * Every category, item and variant below carries an id. That is not decoration
 * in a fixture: the renderers key their `@for` blocks by it since issue #1099,
 * so a fixture without ids would render as one item per category and stop
 * showing what these stories exist to show.
 */
export const WithMenu: Story = {
  args: {
    ...Empty.args,
    menu: {
      categories: [
        {
          id: 'category-pizza',
          title: 'Pizza',
          subtitle:
            'alle Pizzen mit Gouda-Käse, Tomatensauce und Oregano. ca. 32cm',
          items: [
            {
              id: 'item-margharita',
              name: 'Margharita',
              description: 'Tomatensauce & Käse',
              price: 7,
            },
            {
              id: 'item-salami',
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
          id: 'category-toasties',
          title: 'Toasties & Bagels',
          items: [
            {
              id: 'item-meat-lovers-toasties',
              name: "Meat Lover's Toasties",
              description: 'Toast and Cheese',
              price: 0,
              variants: [
                {
                  id: 'variant-toasties-chicken',
                  name: 'with Chicken',
                  price: 5,
                },
                {
                  id: 'variant-toasties-beef',
                  name: 'with Beef',
                  price: 6,
                },
              ],
            },
            {
              id: 'item-vegetarian-bagels',
              name: 'Vegetarian Bagels',
              description: 'Bagel and Cream Cheese',
              price: 0,
              variants: [
                {
                  id: 'variant-bagels-pepper',
                  name: 'with Pepper',
                  price: 5,
                },
                {
                  id: 'variant-bagels-tomato',
                  name: 'with Tomato',
                  price: 6,
                },
              ],
            },
          ],
        },
        {
          id: 'category-kebabs',
          title: 'Kebabs',
          items: [
            {
              id: 'item-kebab-sandwich',
              name: 'Sandwich',
              description: 'Lettuce, Tomato and Onion',
              price: 0,
              variants: [
                {
                  id: 'variant-sandwich-chicken',
                  name: 'with Chicken',
                  price: 5,
                },
                {
                  id: 'variant-sandwich-beef',
                  name: 'with Beef',
                  price: 6,
                },
              ],
            },
            {
              id: 'item-kebab-plate',
              name: 'Plate',
              description: 'Fries or Rice',
              price: 0,
              variants: [
                {
                  id: 'variant-plate-chicken',
                  name: 'with Chicken',
                  price: 8,
                },
                {
                  id: 'variant-plate-beef',
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

/**
 * A dish that is off the menu, with variants nobody toggled separately.
 *
 * Availability travels down: an owner who takes the Plate off has said the
 * dish is off, and its sizes are sizes of that dish. Before issue #1099 each
 * variant was rendered on its own flag, so the unavailable dish sat above two
 * orderable sizes of itself.
 */
export const WithUnavailableDishVariants: Story = {
  args: {
    ...Empty.args,
    menu: {
      categories: [
        {
          id: 'category-kebabs',
          title: 'Kebabs',
          items: [
            {
              id: 'item-kebab-sandwich',
              name: 'Sandwich',
              description: 'Lettuce, Tomato and Onion',
              price: 0,
              variants: [
                {
                  id: 'variant-sandwich-chicken',
                  name: 'with Chicken',
                  price: 5,
                },
              ],
            },
            {
              id: 'item-kebab-plate',
              name: 'Plate',
              description: 'Fries or Rice',
              price: 0,
              isAvailable: false,
              variants: [
                {
                  id: 'variant-plate-chicken',
                  name: 'with Chicken',
                  price: 8,
                },
                {
                  id: 'variant-plate-beef',
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
