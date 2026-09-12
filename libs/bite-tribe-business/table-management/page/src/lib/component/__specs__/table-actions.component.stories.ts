import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  applicationConfig,
  componentWrapperDecorator,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { RestaurantTable, TableStatus } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { tableActions } from '../../integration/table-actions';
import { TableDetail } from '../../integration/table-plan.service';
import { TableActionsComponent } from '../table-actions.component';

addNecessaryIcons();

/**
 * The words the service would have translated.
 *
 * Spelled out rather than pulled off the Transloco catalogue, for the reason
 * the plan's own stories are: a visual reference that changed with the host's
 * language would fail on a translation rather than on a layout.
 */
const WORDS: Record<TableStatus, string> = {
  available: 'Free',
  reserved: 'Reserved',
  occupied: 'Occupied',
  ordering: 'Ordering',
  awaitingPayment: 'Paying',
  cleaning: 'Cleaning',
  disabled: 'Blocked',
};

const table: RestaurantTable = {
  id: 'table-6',
  label: '6',
  roomId: 'room-1',
  shape: 'round',
  diameter: 1000,
  position: { x: 4000, y: 4200 },
  rotation: 0,
  seats: 4,
  enabled: true,
};

const detail = (status: TableStatus, duration?: string): TableDetail => ({
  table,
  status,
  statusLabel: WORDS[status],
  ...(duration === undefined ? {} : { duration }),
});

/**
 * The sheet fills the page it is opened over, so a story has to give it one.
 *
 * A positioned, clipped frame of a device's width is that page: the sheet is
 * `position: absolute` precisely so the reference picture is the box a host
 * sees rather than whatever the Storybook runner's window happens to be.
 */
const over = (
  width: string,
  height = '580px',
): ReturnType<typeof componentWrapperDecorator> =>
  componentWrapperDecorator(
    (story) =>
      `<div style="width: ${width}; height: ${height}; position: relative; overflow: hidden; margin: 0 auto; background: repeating-linear-gradient(45deg, #eef1f4, #eef1f4 12px, #e4e8ed 12px, #e4e8ed 24px);">${story}</div>`,
  );

export default {
  title: 'Business/Table Actions',
  component: TableActionsComponent,
  decorators: [
    applicationConfig({ providers: [provideIonicAngular(getIonicConfig())] }),
    over('520px'),
  ],
} as Meta<TableActionsComponent>;

type Story = StoryObj<TableActionsComponent>;

/**
 * One story per source state, which is the whole point of the set.
 *
 * Read side by side they are the acceptance criterion: the sheet offered at a
 * free table and the sheet offered at a blocked one have different buttons in
 * them, because both are built from the transition matrix rather than from a
 * list somebody keeps in step with it. Nothing here can offer a move the
 * backend would refuse.
 */
const from = (status: TableStatus, duration?: string): Story => ({
  args: { table: detail(status, duration), actions: tableActions(status) },
});

/** The doorway case: seat the party standing in front of the host. */
export const Available: Story = from('available');

/** Held for a party that has not arrived, so it can still be given up. */
export const Reserved: Story = from('reserved', '25 min');

/** A party is seated, and the clock on the table has been running an hour. */
export const Occupied: Story = from('occupied', '1 h 12 min');

/** Reached from issue #1072 events, or by a staff member choosing it. */
export const Ordering: Story = from('ordering', '4 min');

/**
 * The table the use case is about: awaiting payment for twenty minutes is what
 * staff walk to next, and until this sheet existed there was nothing to do
 * about it from the screen.
 */
export const AwaitingPayment: Story = from('awaitingPayment', '20 min');

/** Being turned over, so the only ways out are free again or blocked. */
export const Cleaning: Story = from('cleaning', '3 min');

/**
 * Blocked for this service.
 *
 * One way out, and it is not called "free the table" - a table with a wobbly
 * leg goes back *into service*, which is a different sentence about the same
 * transition.
 */
export const Disabled: Story = from('disabled', '2 h 3 min');

/**
 * The same free table on a phone, which is what a waiter has in an apron
 * pocket.
 *
 * The sheet keeps the bottom of the page at every width, because that is where
 * a thumb is.
 */
export const OnPhone: Story = {
  ...from('available'),
  decorators: [over('390px', '540px')],
};
