import { provideIonicAngular } from '@ionic/angular/standalone';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { TableQrSheetRow } from '../../integration/table-qr-sheets.service';
import { TableQrSheetsComponent } from '../table-qr-sheets.component';

addNecessaryIcons();

/**
 * Stand-ins for tokens: the 26 characters a real one has, and nothing else
 * about one.
 *
 * The length is what these stories need — a blurred or oversized code is the
 * defect this page can actually have, and it only shows against a payload that
 * makes the encoder choose the version a printed code will be. 26 *random*
 * characters is what the repository's secret scanner correctly reports as a
 * leaked credential, and a fixture that trips it is a false alarm every
 * reviewer afterwards has to dismiss. The same choice issue \#1086 made for the
 * rules spec's `/tableTokens` seeds.
 */
const TOKENS = Array.from(
  { length: 6 },
  (_, index) => `TEST-TABLE-QR-TOKEN-${String(index + 1).padStart(6, '0')}`,
);

const room = (index: number): { id: string; name: string } =>
  index < 4
    ? { id: 'room-1', name: 'Main dining room' }
    : { id: 'room-2', name: 'Terrace' };

const rows: TableQrSheetRow[] = TOKENS.map((token, index) => ({
  tableId: `table-${index + 1}`,
  label: `${index + 1}`,
  roomId: room(index).id,
  roomName: room(index).name,
  token,
}));

/**
 * Fifteen tables for the pagination story. The tokens repeat through the six
 * above, because what that story is about is where the page break falls rather
 * than which code is on which table.
 */
const manyRows: TableQrSheetRow[] = Array.from({ length: 15 }, (_, index) => ({
  tableId: `table-${index + 1}`,
  label: `${index + 1}`,
  roomId: room(index).id,
  roomName: room(index).name,
  token: TOKENS[index % TOKENS.length],
}));

export default {
  title: 'Business/Table QR Sheets',
  component: TableQrSheetsComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: {
    restaurantName: 'Trattoria Roma',
    layout: 'sticker',
    room: 'all',
    filterRooms: [
      { id: 'room-1', name: 'Main dining room' },
      { id: 'room-2', name: 'Terrace' },
    ],
    visibleRows: rows,
    selectedRows: rows,
    selectedIds: new Set(rows.map((entry) => entry.tableId)),
    isAuthenticated: true,
  },
} as Meta<TableQrSheetsComponent>;

type Story = StoryObj<TableQrSheetsComponent>;

/** Six tables across two rooms, laid out three stickers to a row. */
export const StickerSheet: Story = {};

/**
 * Fifteen tables, which is two sheets of label paper.
 *
 * The preview draws the pages the printer will produce rather than one long
 * strip, so an owner knows it is two sheets before they load the paper instead
 * of after. Twelve fit on the first page and three start the second.
 */
export const TwoPages: Story = {
  args: {
    visibleRows: manyRows,
    selectedRows: manyRows,
    selectedIds: new Set(manyRows.map((entry) => entry.tableId)),
  },
};

/**
 * The large format, one code per page.
 *
 * The code is more than twice the sticker's width, because a tent card is read
 * from a seated distance rather than from arm's length — which is the whole
 * reason there are two layouts rather than one size that compromises.
 */
export const TableTents: Story = {
  args: { layout: 'tent' },
};

/**
 * One table selected, which is how a replacement is reprinted.
 *
 * Nothing is rotated: the other five tables keep the codes already stuck to
 * them, and the sheet that comes out carries one sticker.
 */
export const SingleReplacement: Story = {
  args: {
    selectedRows: [rows[1]],
    selectedIds: new Set(['table-2']),
  },
};

/** Filtered to one room, so the sheet carries only what is in that room. */
export const OneRoom: Story = {
  args: {
    room: 'room-2',
    visibleRows: rows.slice(4),
    selectedRows: rows.slice(4),
    selectedIds: new Set(['table-5', 'table-6']),
  },
};

/** Nothing ticked, so the print button is closed rather than printing all. */
export const NothingSelected: Story = {
  args: { selectedRows: [], selectedIds: new Set<string>() },
};

/** Two tables out of service, named so the owner is not left counting. */
export const SomeTablesOutOfService: Story = {
  args: { disabledLabels: ['7', '8'] },
};

/**
 * A table in service that the backend issued no code for.
 *
 * Not expected, and reported rather than dropped: an owner who prints five
 * codes for six tables otherwise finds out by walking the room.
 */
export const MissingCode: Story = {
  args: { missingTokenLabels: ['9'] },
};

/** The plan has no table in service, so there is nothing to print. */
export const Empty: Story = {
  args: {
    visibleRows: [],
    selectedRows: [],
    selectedIds: new Set<string>(),
    filterRooms: [],
  },
};

/** The read is still running, so no empty state is claimed prematurely. */
export const Loading: Story = {
  args: {
    loading: true,
    visibleRows: [],
    selectedRows: [],
    selectedIds: new Set<string>(),
  },
};

/** The read failed, which is a different answer from an empty restaurant. */
export const LoadFailed: Story = {
  args: {
    loadFailed: true,
    visibleRows: [],
    selectedRows: [],
    selectedIds: new Set<string>(),
  },
};
