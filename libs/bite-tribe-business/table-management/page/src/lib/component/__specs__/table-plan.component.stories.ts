import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  applicationConfig,
  componentWrapperDecorator,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { FloorPlanItem } from 'bite-tribe-business/floor-plan-ui';
import { RestaurantTable, Room, TABLE_STATUSES, TableStatus } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { TableDetail } from '../../integration/table-plan.service';
import { TableStatusCount } from '../../integration/table-plan-summary';
import { TablePlanComponent } from '../table-plan.component';

addNecessaryIcons();

/**
 * The words the service would have translated.
 *
 * Spelled out here rather than pulled off the Transloco catalogue, so a story
 * renders the same text whatever locale the Storybook host happens to be in -
 * a visual reference that changed with the language would fail on a translation
 * rather than on a layout.
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

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 9000, height: 12_000 },
  objects: [
    {
      id: 'wall-1',
      type: 'wall',
      position: { x: 3000, y: 7400 },
      size: { width: 5200, height: 120 },
      rotation: 0,
    },
    {
      id: 'bar-1',
      type: 'bar',
      position: { x: 8100, y: 2600 },
      size: { width: 600, height: 3000 },
      rotation: 0,
    },
  ],
  version: 4,
  ...over,
});

const terrace = room({
  id: 'room-2',
  name: 'Terrace',
  order: 1,
  size: { width: 6000, height: 4000 },
  objects: [],
});

const table = (
  id: string,
  x: number,
  y: number,
  label: string,
  status: TableStatus,
  duration?: string,
): FloorPlanItem => ({
  id,
  kind: 'table',
  variant: 'table-round',
  position: { x, y },
  size: { width: 1000, height: 1000 },
  rotation: 0,
  label,
  round: true,
  seats: 4,
  enabled: true,
  status,
  statusLabel: WORDS[status],
  ...(duration === undefined ? {} : { statusDuration: duration }),
});

const geometry: FloorPlanItem[] = [
  {
    id: 'wall-1',
    kind: 'object',
    variant: 'wall',
    position: { x: 3000, y: 7400 },
    size: { width: 5200, height: 120 },
    rotation: 0,
    round: false,
  },
  {
    id: 'bar-1',
    kind: 'object',
    variant: 'bar',
    position: { x: 8100, y: 2600 },
    size: { width: 600, height: 3000 },
    rotation: 0,
    round: false,
  },
];

/**
 * One table in every status the model knows, laid out in lifecycle order.
 *
 * Seven marks side by side is the reference the greyscale criterion is read
 * against: printed or photocopied, the silhouettes and the words still tell
 * them apart, and the colours stop being the thing carrying the meaning.
 */
const everyStatus: FloorPlanItem[] = TABLE_STATUSES.map((status, index) =>
  table(
    `table-${index + 1}`,
    1500 + (index % 3) * 2800,
    2200 + Math.floor(index / 3) * 3200,
    String(index + 1),
    status,
    status === 'available' ? undefined : `${(index + 1) * 7} min`,
  ),
);

/**
 * A plausible service in a room of eighteen tables.
 *
 * The acceptance criterion about forty tables on a tablet is about *density*,
 * and this is the shape of it: most tables occupied, a couple turning over and
 * one blocked, so the room reads as a pattern rather than as a legend.
 */
const inService: FloorPlanItem[] = [
  ...geometry,
  table('t1', 1500, 1800, '1', 'occupied', '42 min'),
  table('t2', 4000, 1800, '2', 'occupied', '18 min'),
  table('t3', 6500, 1800, '3', 'available'),
  table('t4', 1500, 4200, '4', 'awaitingPayment', '6 min'),
  table('t5', 4000, 4200, '5', 'occupied', '1 h 12 min'),
  table('t6', 6500, 4200, '6', 'reserved', '25 min'),
  table('t7', 1500, 6400, '7', 'cleaning', '3 min'),
  table('t8', 4000, 6400, '8', 'available'),
  table('t9', 6500, 6400, '9', 'ordering', '4 min'),
  table('t10', 1500, 8800, '10', 'occupied', '55 min'),
  table('t11', 4000, 8800, '11', 'available'),
  table('t12', 6500, 8800, '12', 'disabled', '2 h 3 min'),
  table('t13', 1500, 11_000, '13', 'occupied', '9 min'),
  table('t14', 4000, 11_000, '14', 'available'),
  table('t15', 6500, 11_000, '15', 'reserved', '8 min'),
];

const counts = (items: FloorPlanItem[]): TableStatusCount[] => {
  const named: TableStatus[] = [
    'available',
    'occupied',
    'reserved',
    'cleaning',
  ];
  const tally = (status: TableStatus): number =>
    items.filter((item) => item.status === status).length;
  const extras = TABLE_STATUSES.filter(
    (status) => !named.includes(status) && tally(status) > 0,
  );

  return [...named, ...extras].map((status) => ({
    status,
    count: tally(status),
  }));
};

const tableFive: RestaurantTable = {
  id: 't5',
  label: '5',
  roomId: 'room-1',
  shape: 'round',
  diameter: 1000,
  position: { x: 4000, y: 4200 },
  rotation: 0,
  seats: 4,
  enabled: true,
};

const detail: TableDetail = {
  table: tableFive,
  status: 'occupied',
  statusLabel: 'Occupied',
  duration: '1 h 12 min',
  note: 'Birthday cake at 21:00',
};

/**
 * The page at one device width, drawn inside a frame of that width.
 *
 * The width is set here rather than left to a Loki viewport, because the
 * business app's stories are baselined at the laptop configuration only (issue
 * #1547) - a phone reference driven by the runner would simply not be captured.
 * A fixed frame also means the phone, tablet and laptop references sit side by
 * side in one run rather than in three.
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
  title: 'Business/Table Plan',
  component: TablePlanComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: {
    rooms: [room(), terrace],
    selectedRoom: room(),
    restaurantName: 'Trattoria Roma',
    isAuthenticated: true,
    isLive: true,
    items: inService,
    roomTableCount: 15,
    summary: counts(inService),
  },
} as Meta<TablePlanComponent>;

type Story = StoryObj<TablePlanComponent>;

/** A room mid-service on a laptop, which is what an owner watches it on. */
export const Laptop: Story = { decorators: [at('1280px')] };

/**
 * The same stored plan on a tablet, which is what a host holds at the door.
 *
 * Recognisably the same room: the plan is drawn from a `viewBox` in
 * millimetres, so it is the same drawing at a different size rather than a
 * different layout of the same tables.
 */
export const Tablet: Story = { decorators: [at('834px')] };

/**
 * And on a phone, where the detail panel drops under the plan instead of
 * standing beside it.
 *
 * Nothing is hidden and nothing scrolls sideways - the acceptance criterion the
 * editor deliberately does not meet, because an owner arranging a room to the
 * millimetre is at a desk and a waiter checking table 6 is not.
 */
export const Phone: Story = { decorators: [at('390px', '800px')] };

/**
 * One table in every status, at laptop width.
 *
 * The reference the greyscale and colour-vision criterion is read against: the
 * marks differ in silhouette and in filled-against-hollow, and every one of
 * them carries its word, so the colour is the channel that is allowed to fail.
 */
export const EveryStatus: Story = {
  args: {
    items: [...geometry, ...everyStatus],
    roomTableCount: everyStatus.length,
    summary: counts(everyStatus),
  },
  decorators: [at('1280px')],
};

/** The picked table, with the note and the clock the plan has no room for. */
export const TableSelected: Story = {
  args: { selectedIds: ['t5'], selectedTable: detail },
  decorators: [at('1280px')],
};

/** The same selection on a phone, where the detail stands under the plan. */
export const TableSelectedOnPhone: Story = {
  args: { selectedIds: ['t5'], selectedTable: detail },
  decorators: [at('390px', '900px')],
};

/**
 * Before the first snapshot has arrived.
 *
 * The plan is drawn from defaults, so the indicator says so: a room where
 * everything looks free has to be distinguishable from a room nothing has been
 * heard about yet.
 */
export const Connecting: Story = {
  args: { isLive: false },
  decorators: [at('1280px')],
};

/** One room, so the switcher is not drawn at all. */
export const SingleRoom: Story = {
  args: { rooms: [room()] },
  decorators: [at('1280px')],
};

/** The plan is still being read, and no empty room is claimed prematurely. */
export const Loading: Story = {
  args: { loading: true, rooms: [], selectedRoom: undefined, items: [] },
  decorators: [at('1280px', '360px')],
};

/**
 * The read failed.
 *
 * Deliberately not the empty state: telling staff mid-service that their
 * restaurant has no rooms is the trap issue #1232 left in the Bite details
 * page.
 */
export const LoadFailed: Story = {
  args: { loadFailed: true, rooms: [], selectedRoom: undefined, items: [] },
  decorators: [at('1280px', '360px')],
};

/** A published plan with no tables in the open room yet. */
export const RoomWithoutTables: Story = {
  args: {
    selectedRoom: terrace,
    items: [],
    roomTableCount: 0,
    summary: counts([]),
  },
  decorators: [at('1280px')],
};
