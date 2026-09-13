import { addNecessaryIcons, getIonicConfig } from 'utils';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { Menu } from 'model';
import { MenuComponent } from '../menu.component';

addNecessaryIcons();

/**
 * The renderer both menus share (GitHub issue #1102).
 *
 * One renderer serves the authenticated page, the public one and the ordering
 * screen of issue #1103, so these cover the three inputs that differ between
 * them: the currency the prices are stated in, whether a dish can be turned
 * into a Bite, and whether it can be added to a table cart. Three renderers is
 * how three menus start disagreeing about what an unavailable dish looks like.
 */
export default {
  title: 'Components/Menu',
  component: MenuComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<MenuComponent>;

type Story = StoryObj<MenuComponent>;

const MENU: Menu = {
  id: 'menu-1',
  currency: 'JPY',
  categories: [
    {
      id: 'category-ramen',
      title: 'Ramen',
      items: [
        {
          id: 'item-shoyu',
          name: 'Shoyu',
          description: 'Soy broth, chashu, menma',
          price: 1200,
        },
        {
          id: 'item-tonkotsu',
          name: 'Tonkotsu',
          description: 'Pork broth, twelve hours',
          price: 1400,
          isAvailable: false,
        },
      ],
    },
  ],
};

/** The authenticated menu: priced, and every dish can become a Bite. */
export const InTheApp: Story = {
  args: { menu: MENU },
};

/**
 * The public menu of issue #1102, read by somebody with no account.
 *
 * The Bite button is gone, because the reader may have no BiteTribe account at
 * all and that button opens a sign-up for a product they came here to read a
 * menu of. Everything else - the prices, the currency, the unavailable dish -
 * is identical, which is the point of sharing the renderer.
 */
export const ReadOnlyForAGuest: Story = {
  args: { menu: MENU, canCreateBite: false },
};

/**
 * The same menu with a dish that has sizes, one of them sold out.
 *
 * A fixture of its own rather than an addition to `MENU`, so the two stories
 * above keep the visual references they already have: a shared fixture gaining
 * a dish would fail both of them for a change that is about neither.
 */
const ORDERING_MENU: Menu = {
  ...MENU,
  categories: [
    {
      ...MENU.categories[0],
      items: [
        ...MENU.categories[0].items,
        {
          id: 'item-tsukemen',
          name: 'Tsukemen',
          description: 'Dipping noodles, served cold',
          price: 1300,
          variants: [
            {
              id: 'variant-tsukemen-large',
              name: 'Large',
              description: '',
              price: 1600,
            },
            {
              id: 'variant-tsukemen-extra',
              name: 'Extra large',
              description: '',
              price: 1900,
              isAvailable: false,
            },
          ],
        },
      ],
    },
  ],
};

/**
 * The ordering screen of issue #1103, where a guest at a table adds dishes to a
 * cart.
 *
 * The two flags are deliberately independent and this is what that buys: the
 * add button is on and the Bite button is off, because the guest may have no
 * BiteTribe account at all. A single "is this interactive" flag would have made
 * those one decision.
 *
 * The unavailable dish and the sold-out size are what the story is really for.
 * Both carry a disabled add button rather than no button - a dish that vanishes
 * when the kitchen runs out reads as a menu that changed, and a guest looking
 * for it would ask a member of staff about a dish that is still on the printed
 * card.
 */
export const OrderingAtATable: Story = {
  args: { menu: ORDERING_MENU, canCreateBite: false, canAddToCart: true },
};
