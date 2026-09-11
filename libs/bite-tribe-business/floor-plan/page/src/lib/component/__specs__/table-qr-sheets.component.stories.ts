import { provideIonicAngular } from '@ionic/angular/standalone';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { TableQrSheetRow } from '../../integration/table-qr-sheets.service';
import { TableQrSheetsComponent } from '../table-qr-sheets.component';

addNecessaryIcons();

/**
 * Tokens of the shape issue \#1086 issues: 26 Crockford base32 characters,
 * drawn here so the stories render real codes rather than placeholders — a
 * blurred or oversized code is the defect this page can actually have, and it
 * is only visible against a payload of the right length.
 */
const TOKENS = [
  '7K3QMXB2VZ0HNDR5TWY9FC8AJP',
  'QZ5V8T2W7YRNJ0HDBM3XKC9FPA',
  'JM0R7XA4TCK92WPZBY6HND5VQF',
  'X2B9HKQ7MJ4CRZ0FNTVW3YPD85',
  'V8YJ3ZTQ5RW7K0NBXMC2HFPA96',
  'D4NQ8MZ0YR7KTJXB596VWCHPF2',
];

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
