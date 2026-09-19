import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { MenuQrComponent } from '../menu-qr.component';

/**
 * The code a restaurant prints so anybody can read its menu
 * (GitHub issue #370).
 *
 * It gets stories of its own because it is the surface that decides what ends
 * up glued to a window: the printed size of the code, and the two states the
 * block has. Like every other code in the workspace it must ignore the theme -
 * a dark-mode inversion looks right on screen and scans as nothing at all -
 * which is what a reference image catches.
 */
export default {
  title: 'Business/Menu QR Code',
  component: MenuQrComponent,
  args: {
    restaurantId: 'restaurant-1',
    restaurantName: 'Sakura Kitchen',
    hasMenu: true,
  },
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="width: 320px">${story}</div>`,
    ),
  ],
} as Meta<MenuQrComponent>;

type Story = StoryObj<MenuQrComponent>;

/**
 * What the owner sees once the restaurant has a menu: the code, the address
 * under it as text, and the two ways of taking it away.
 */
export const Published: Story = {};

/**
 * A restaurant with no menu yet.
 *
 * No code, deliberately. One would resolve to the public page's `menuMissing`
 * refusal - an honest answer to a scan, and a poor thing to have printed and
 * glued to a window.
 */
export const NoMenuYet: Story = {
  args: { hasMenu: false },
};

/**
 * A restaurant whose name is not on screen yet, which is the state the block
 * is in while the restaurant document is still being read.
 */
export const WithoutName: Story = {
  args: { restaurantName: '' },
};
