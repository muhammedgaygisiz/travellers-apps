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

/** Opens an editor the way an owner does, by tapping the list (#2182). */
const tap = async (
  canvasElement: HTMLElement,
  selector: string,
): Promise<void> => {
  canvasElement.querySelector<HTMLElement>(selector)?.click();
  // Two frames: one for the click's change detection, one for Ionic to paint.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

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
          // Sold as its variants only, so it has no price of its own (#2182).
          price: 0,
          isAvailable: true,
          // Declared by the restaurant (#2194).
          dietaryLabels: ['vegetarian'],
          dietaryOptions: ['gluten-free'],
          variants: [
            {
              id: 'variant-margherita-regular',
              name: 'Regular, 32 cm',
              description: '',
              price: 9,
            },
            {
              id: 'variant-margherita-bufala',
              name: 'Con bufala',
              description: '',
              price: 12,
              isAvailable: false,
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
          { id: 'extra-mozzarella', name: 'Extra mozzarella', price: 2 },
          { id: 'extra-nduja', name: "'Nduja", price: 2.5 },
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
 * The menu as a list (GitHub issue #2182): two categories, a dish sold as two
 * variants with one of them off, a dish that is off, and a category's extras
 * on one line.
 */
export const Default: Story = {};

/** A dish opened from the list: its fields, its variants and one Save. */
export const DishEditor: Story = {
  play: async ({ canvasElement }) =>
    tap(
      canvasElement,
      '[data-testid="menu-dish-item-margherita"] [data-testid="open-dish"]',
    ),
};

/**
 * A dish whose label diners' disputes removed (GitHub issue #2198): the
 * pickers do not offer it, and the note under them says it was removed and
 * who can restore it.
 */
export const DishWithRemovedLabel: Story = {
  args: {
    menu: {
      ...menu,
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.id === 'item-margherita'
            ? { ...item, removedDietaryLabels: ['vegan' as const] }
            : item,
        ),
      })),
    },
  },
  play: async ({ canvasElement }) =>
    tap(
      canvasElement,
      '[data-testid="menu-dish-item-margherita"] [data-testid="open-dish"]',
    ),
};

/**
 * A dish with options, which change nothing about its price (GitHub issue
 * #2254): the list shows each group on a line under the dish, and the editor
 * shows each group as a card with its choices and whether guests must choose.
 */
export const DishWithOptions: Story = {
  args: {
    menu: {
      ...menu,
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.id === 'item-diavola'
            ? {
                ...item,
                isAvailable: true,
                optionGroups: [
                  {
                    id: 'option-heat',
                    name: 'How hot',
                    required: true,
                    choices: [
                      { id: 'choice-medium', name: 'Medium' },
                      { id: 'choice-hot', name: 'Hot' },
                      { id: 'choice-calabrian', name: 'Calabrian hot' },
                    ],
                  },
                  {
                    id: 'option-crust',
                    name: 'Crust',
                    required: false,
                    choices: [
                      { id: 'choice-classic', name: 'Classic' },
                      { id: 'choice-wholegrain', name: 'Wholegrain' },
                    ],
                  },
                ],
              }
            : item,
        ),
      })),
    },
  },
  play: async ({ canvasElement }) =>
    tap(
      canvasElement,
      '[data-testid="menu-dish-item-diavola"] [data-testid="open-dish"]',
    ),
};

/** A new dish, from a category's "Add dish". */
export const NewDish: Story = {
  play: async ({ canvasElement }) =>
    tap(
      canvasElement,
      '[data-testid="menu-category-category-antipasti"] [data-testid="add-dish"]',
    ),
};

/** A category opened from its edit button, with its extras below. */
export const CategoryEditor: Story = {
  play: async ({ canvasElement }) =>
    tap(
      canvasElement,
      '[data-testid="menu-category-category-pizze"] [data-testid="edit-category"]',
    ),
};

/**
 * A category with no extras yet (GitHub issue #1598).
 *
 * The state every existing menu is in, and the one the editor has to make
 * obvious: an owner who has never seen an extras section needs the empty
 * section to say what one is for before they will add anything to it.
 */
export const CategoryWithoutExtras: Story = {
  args: {
    menu: {
      ...menu,
      categories: menu.categories.map((category) => ({
        ...category,
        extrasBlock: undefined,
      })),
    },
  },
};

/** A menu that has just been created and holds no category yet. */
export const EmptyMenu: Story = {
  args: {
    menu: { id: 'menu-osteria', restaurantId: trattoria.id, categories: [] },
  },
};

/**
 * A menu verification built from guests' Bites (GitHub issue #2214): the
 * notice above the list, and the button that takes it as the restaurant's.
 */
export const DerivedFromBites: Story = {
  args: { menu: { ...menu, currency: 'EUR', derivedFromBites: true } },
};
