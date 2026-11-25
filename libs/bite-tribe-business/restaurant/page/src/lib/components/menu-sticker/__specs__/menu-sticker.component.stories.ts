import { Meta, StoryObj } from '@storybook/angular';
import { MenuStickerComponent } from '../menu-sticker.component';

/**
 * The menu code laid out for a door and for a table (GitHub issue #2273).
 *
 * The printed stories are what reaches the paper: captured in print media, so
 * the sticker is drawn at its real size - 100 mm, or 105 mm for the tent - and
 * a change that blanks it or crops it fails the visual suite.
 */
export default {
  title: 'Business/Menu Sticker',
  component: MenuStickerComponent,
  args: {
    format: 'door',
    url: 'https://bitetribe.app/m/restaurant-1',
    restaurantName: 'Sakura Kitchen',
  },
} as Meta<MenuStickerComponent>;

type Story = StoryObj<MenuStickerComponent>;

/** The 10 x 10 cm square for a door or a window, as the owner previews it. */
export const DoorSticker: Story = {};

/** The door sticker at its printed size. */
export const DoorStickerPrinted: Story = {
  parameters: { loki: { media: 'print' } },
};

/**
 * A name long enough to wrap: it takes two lines and the code gives way,
 * rather than anything falling off the sheet.
 */
export const DoorStickerLongName: Story = {
  args: { restaurantName: 'Trattoria da Giovanni e Figli al Ponte Vecchio' },
};

/**
 * The A6 table tent: two identical faces, the lower one upside down, so it
 * reads right side up from both sides once folded along the dashed line.
 */
export const TableTent: Story = { args: { format: 'tent' } };

/** The table tent at its printed size. */
export const TableTentPrinted: Story = {
  args: { format: 'tent' },
  parameters: { loki: { media: 'print' } },
};
