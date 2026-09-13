import { addNecessaryIcons, getIonicConfig } from 'utils';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { Menu } from 'model';
import { MenuComponent } from '../menu.component';

addNecessaryIcons();

/**
 * The renderer both menus share (GitHub issue #1102).
 *
 * One renderer serves the authenticated page and the public one, so these cover
 * the two inputs that differ between them: the currency the prices are stated
 * in, and whether a dish can be turned into a Bite. Two renderers is how two
 * menus start disagreeing about what an unavailable dish looks like.
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
