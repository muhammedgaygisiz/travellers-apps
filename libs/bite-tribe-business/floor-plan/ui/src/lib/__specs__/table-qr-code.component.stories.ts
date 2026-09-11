import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { TableQrCodeComponent } from '../table-qr-code.component';

/**
 * A stand-in for a token: the 26 characters a real one has, and nothing else
 * about one.
 *
 * The length is what these stories need, because it is what decides the QR
 * version the encoder picks and therefore how fine the printed modules are. 26
 * *random* characters is what the repository's secret scanner correctly
 * reports as a leaked credential, and a fixture that trips it is a false alarm
 * every reviewer afterwards has to dismiss. The same choice issue \#1086 made
 * for the rules spec's `/tableTokens` seeds.
 */
const TOKEN = 'TEST-TABLE-QR-TOKEN-000012';

/**
 * The code a guest scans, on its own (GitHub issue \#1087).
 *
 * It gets stories of its own rather than only appearing inside the sheet
 * because it is the one surface in the app that must ignore the theme: the
 * fills are literal black and white, and a reference image is how a dark-mode
 * inversion — which looks right on screen and scans as nothing — is caught.
 *
 * The component draws at whatever width it is given, so each story fixes one,
 * and the two sizes are the ones the product actually prints at. A change that
 * coarsens the modules or thins the four-module quiet zone then shows up as
 * the scan-distance regression it is rather than as a smaller picture.
 */
export default {
  title: 'Business/Table QR Code',
  component: TableQrCodeComponent,
  args: { token: TOKEN, label: '' },
} as Meta<TableQrCodeComponent>;

type Story = StoryObj<TableQrCodeComponent>;

/**
 * The sticker, at the 38 mm it is printed and stuck to the table at.
 *
 * A phone resolves a QR code from roughly ten times its own width, so this is
 * the size read at arm's length by somebody already sitting down.
 */
export const Sticker: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="width: 38mm">${story}</div>`,
    ),
  ],
};

/**
 * The tent card, at 80 mm.
 *
 * The same code at the same module count, read across the table from a seated
 * 600 to 700 mm. Both sizes exist because one size would be either too small
 * to read across the table or too large to put twelve on a sheet.
 */
export const TableTent: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="width: 80mm">${story}</div>`,
    ),
  ],
};

/**
 * Named for a screen reader, which is its other state.
 *
 * On the printed sheet the code is presentational, because the table number,
 * the room and the restaurant are in text beside it. A caller that draws one
 * code on its own gives it a name instead, and then it is announced as an
 * image rather than skipped.
 */
export const Named: Story = {
  args: { label: 'QR code for table 12' },
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="width: 38mm">${story}</div>`,
    ),
  ],
};
