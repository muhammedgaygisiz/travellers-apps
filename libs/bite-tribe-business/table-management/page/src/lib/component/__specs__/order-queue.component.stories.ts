import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  applicationConfig,
  componentWrapperDecorator,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type {
  OrderAction,
  OrderTableGroup,
  QueuedOrder,
} from '../../integration/order-queue-groups';
import { OrderQueueComponent } from '../order-queue.component';

addNecessaryIcons();

/**
 * The words and the ages the service would have translated.
 *
 * Spelled out here rather than pulled off the Transloco catalogue, so a story
 * renders the same text whatever locale the Storybook host is in - a visual
 * reference that changed with the language would fail on a translation rather
 * than on a layout.
 */
const waiting = (minutes: number): QueuedOrder['waiting'] => ({
  key:
    minutes === 0 ? 'table-status-elapsed-now' : 'table-status-elapsed-minutes',
  params: { hours: 0, minutes },
});

const accept: OrderAction = {
  to: 'accepted',
  labelKey: 'order-action-accept',
  needsReason: false,
};

const prepare: OrderAction = {
  to: 'preparing',
  labelKey: 'order-action-preparing',
  needsReason: false,
};

const serve: OrderAction = {
  to: 'served',
  labelKey: 'order-action-served',
  needsReason: false,
};

const cancel: OrderAction = {
  to: 'cancelled',
  labelKey: 'order-action-cancel',
  needsReason: true,
};

const order = (over: Partial<QueuedOrder> = {}): QueuedOrder => ({
  id: 'order-1',
  visitId: 'visit-1',
  status: 'submitted',
  statusKey: 'order-status-submitted',
  waiting: waiting(2),
  urgent: false,
  lines: [
    { name: 'Margherita', quantity: 1 },
    { name: 'Spaghetti alle vongole', quantity: 2 },
  ],
  total: 38,
  currency: 'EUR',
  actions: [accept, cancel],
  ...over,
});

const group = (over: Partial<OrderTableGroup> = {}): OrderTableGroup => ({
  tableId: 'table-12',
  label: '12',
  orders: [order()],
  oldest: waiting(2),
  urgent: false,
  ...over,
});

/**
 * A pass mid-service: a round that has just come in, one the kitchen is already
 * cooking, and a table that has been waiting long enough to be a problem.
 */
const busy: OrderTableGroup[] = [
  group({
    tableId: 'table-12',
    label: '12',
    oldest: waiting(2),
    orders: [
      order({
        id: 'o1',
        waiting: waiting(2),
        lines: [
          { name: 'Margherita', quantity: 1 },
          { name: 'Spaghetti alle vongole', quantity: 2, notes: 'No chilli' },
        ],
      }),
    ],
  }),
  group({
    tableId: 'table-7',
    label: '7',
    oldest: waiting(6),
    orders: [
      order({
        id: 'o2',
        status: 'preparing',
        statusKey: 'order-status-preparing',
        waiting: waiting(6),
        actions: [serve, cancel],
        lines: [
          { name: 'Tagliata', variantName: 'Rare', quantity: 2 },
          { name: 'Tiramisu', quantity: 2 },
        ],
      }),
      order({
        id: 'o3',
        status: 'accepted',
        statusKey: 'order-status-accepted',
        waiting: waiting(4),
        actions: [prepare, serve, cancel],
        lines: [{ name: 'Acqua frizzante', quantity: 1 }],
      }),
    ],
  }),
  group({
    tableId: 'table-3',
    label: '3',
    urgent: true,
    oldest: waiting(21),
    orders: [
      order({
        id: 'o4',
        status: 'accepted',
        statusKey: 'order-status-accepted',
        waiting: waiting(21),
        urgent: true,
        actions: [prepare, serve, cancel],
        lines: [
          {
            name: 'Branzino al forno',
            quantity: 1,
            notes: 'Allergy: no butter, please',
          },
        ],
      }),
    ],
  }),
];

/**
 * The page at one device width, drawn inside a frame of that width.
 *
 * The width is set here rather than left to a Loki viewport, for the reason the
 * table plan's stories give: the business app's stories are baselined at the
 * laptop configuration only (issue #1547), so a phone reference driven by the
 * runner would simply not be captured.
 */
const at = (
  width: string,
  height = '760px',
): ReturnType<typeof componentWrapperDecorator> =>
  componentWrapperDecorator(
    (story) =>
      `<div style="width: ${width}; height: ${height}; position: relative; overflow: hidden; margin: 0 auto;">${story}</div>`,
  );

export default {
  title: 'Business/Order Queue',
  component: OrderQueueComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: {
    groups: busy,
    openCount: 4,
    restaurantName: 'Trattoria Roma',
    isAuthenticated: true,
    liveStatus: 'live' as const,
  },
} as Meta<OrderQueueComponent>;

type Story = StoryObj<OrderQueueComponent>;

/** The pass on a laptop, which is where a head chef keeps it open. */
export const Laptop: Story = { decorators: [at('1280px')] };

/** The same queue on a tablet clamped by the grill. */
export const Tablet: Story = { decorators: [at('834px', '900px')] };

/** And on a phone, which is what a waiter checks between tables. */
export const Phone: Story = { decorators: [at('390px', '900px')] };

/**
 * Nothing waiting.
 *
 * Deliberately not a blank page: a kitchen that has caught up and a queue that
 * has stopped updating look the same, so the empty state says which it is and
 * the indicator above it says the listener is alive.
 */
export const Empty: Story = {
  args: { groups: [], openCount: 0 },
  decorators: [at('1280px')],
};

/**
 * Before the first delivery has arrived.
 *
 * An empty list drawn from no delivery at all is indistinguishable from a
 * kitchen with nothing to cook, and a pass has to be able to tell them apart.
 */
export const Connecting: Story = {
  args: {
    groups: [],
    openCount: 0,
    loading: true,
    liveStatus: 'connecting' as const,
  },
  decorators: [at('1280px')],
};

/**
 * The queue is a picture of the past, and says how far past.
 *
 * "Not current" without a number is a warning nobody can act on - the same rule
 * the floor plan's indicator follows, said in the same four words.
 */
export const Stale: Story = {
  args: { liveStatus: 'stale' as const, lastUpdated: '6 min' },
  decorators: [at('1280px')],
};

/** The row whose press has not been answered yet. */
export const Busy: Story = {
  args: { busyOrderId: 'o1' },
  decorators: [at('1280px')],
};

/**
 * The one action that asks before it acts.
 *
 * The send button is out of reach until a reason has been typed, which is the
 * markup's half of "cancellations are explained, not silent". The backend
 * refuses a reasonless cancellation as well; this is what stops that refusal
 * ever being what a kitchen sees.
 */
export const Cancelling: Story = {
  args: {
    pendingCancellation: {
      visitId: 'visit-1',
      orderId: 'o1',
      label: '12',
    },
  },
  decorators: [at('1280px')],
};

/**
 * A table that has gone from the floor plan since its order was placed.
 *
 * The group survives it. Dropping it would lose an order somebody is waiting
 * for in order to tidy up a number.
 */
export const UnknownTable: Story = {
  args: {
    groups: [group({ tableId: 'table-gone', label: '', oldest: waiting(9) })],
    openCount: 1,
    labelsFailed: true,
  },
  decorators: [at('1280px')],
};

/** The alert this device has switched on for a busy service. */
export const AlertOn: Story = {
  args: { alertEnabled: true, justArrived: true },
  decorators: [at('1280px')],
};
