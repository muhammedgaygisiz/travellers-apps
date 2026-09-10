import { provideIonicAngular } from '@ionic/angular/standalone';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { FloorPlanItem } from 'bite-tribe-business/floor-plan-ui';
import { RestaurantTable, Room } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { FloorPlanComponent } from '../floor-plan.component';

addNecessaryIcons();

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 3,
  ...over,
});

const terrace = room({
  id: 'room-2',
  name: 'Terrace',
  order: 1,
  size: { width: 6000, height: 4000 },
});

/** What each room holds, as the switcher shows it (GitHub issue #1085). */
const capacities = {
  'room-1': { tables: 3, seats: 12, disabled: 0 },
  'room-2': { tables: 4, seats: 14, disabled: 1 },
};

const total = { rooms: 2, tables: 7, seats: 26, disabled: 1 };

const roundTable = (
  id: string,
  x: number,
  y: number,
  label: string,
  over: Partial<FloorPlanItem> = {},
): FloorPlanItem => ({
  id,
  kind: 'table',
  variant: 'table-round',
  position: { x, y },
  size: { width: 900, height: 900 },
  rotation: 0,
  label,
  round: true,
  seats: 4,
  enabled: true,
  ...over,
});

/** The selected table as the entity the properties card edits. */
const tableTwo: RestaurantTable = {
  id: 'table-2',
  label: '2',
  roomId: 'room-1',
  shape: 'round',
  diameter: 900,
  position: { x: 3400, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
};

/** Enough on the plan that the toolbar and the properties panel have a subject. */
const furnished: FloorPlanItem[] = [
  {
    id: 'wall-1',
    kind: 'object',
    variant: 'wall',
    position: { x: 2600, y: 7200 },
    size: { width: 5200, height: 120 },
    rotation: 0,
    round: false,
  },
  {
    id: 'counter-1',
    kind: 'object',
    variant: 'counter',
    position: { x: 1500, y: 900 },
    size: { width: 2600, height: 600 },
    rotation: 0,
    round: false,
  },
  roundTable('table-1', 1500, 3000, '1'),
  roundTable('table-2', 3400, 3000, '2'),
  roundTable('table-3', 5300, 3000, '3'),
];

export default {
  title: 'Business/Floor Plan',
  component: FloorPlanComponent,
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
    roomCapacities: capacities,
    restaurantCapacity: total,
    restaurantName: 'Trattoria Roma',
    gridSpacing: 500,
    snapEnabled: true,
    snapSpacing: 500,
    isAuthenticated: true,
  },
} as Meta<FloorPlanComponent>;

type Story = StoryObj<FloorPlanComponent>;

/** Two rooms, the first one open, and its dimensions in the form in metres. */
export const Default: Story = {};

/**
 * A restaurant on two levels (GitHub issue #1085).
 *
 * The switcher heads each level once a room names one, and a group is shown
 * where its first room already stood — naming a floor groups the list without
 * reordering it. A room that names no level keeps its own heading rather than
 * being folded into one, because "no floor" is an answer and not a gap.
 */
export const SeveralFloors: Story = {
  args: {
    rooms: [
      room({ floor: 'Ground floor' }),
      { ...terrace, floor: 'Ground floor' },
      room({
        id: 'room-3',
        name: 'Private gallery',
        order: 2,
        floor: 'Upstairs',
        size: { width: 5000, height: 5000 },
      }),
      room({ id: 'room-4', name: 'Cellar', order: 3 }),
    ],
    roomCapacities: {
      ...capacities,
      'room-3': { tables: 2, seats: 10, disabled: 0 },
      'room-4': { tables: 0, seats: 0, disabled: 0 },
    },
    restaurantCapacity: { rooms: 4, tables: 9, seats: 36, disabled: 1 },
    items: furnished,
  },
};

/**
 * The ordinary starting state.
 *
 * A restaurant begins with no rooms, so the empty state is a sentence that says
 * what a room is for, and the one button under it is the whole page.
 */
export const Empty: Story = {
  args: { rooms: [], selectedRoom: undefined },
};

/** The rooms are still being read, so no empty state is claimed prematurely. */
export const Loading: Story = {
  args: { rooms: [], selectedRoom: undefined, loading: true },
};

/**
 * The read failed.
 *
 * Deliberately not the empty state: "you have no rooms yet" invites the owner
 * to build a plan they may already have, which is the trap issue #1232 left in
 * the Bite details page.
 */
export const LoadFailed: Story = {
  args: { rooms: [], selectedRoom: undefined, loadFailed: true },
};

/** A write is in flight, so every button that would start a second one locks. */
export const Saving: Story = {
  args: { saving: true },
};

/**
 * The palette and a furnished room.
 *
 * Every palette entry is drawn against one extent, so a 450 mm chair is a
 * fraction of a three-metre bar rather than the same width as it — the plan is
 * to scale before the owner has placed anything.
 */
export const WithObjects: Story = {
  args: { items: furnished },
};

/**
 * One table selected, so both properties cards are open.
 *
 * The geometry card is where the table stands; the table card is what it is
 * called, how many people it seats and whether it is in service. Two cards
 * rather than one, because the two outlive each other: rearranging a room never
 * renames a table, and renaming one never moves it.
 *
 * The room the table stands in is on the table card too (GitHub issue #1085):
 * a restaurant with a second room can move it there, and it keeps its number
 * and its QR token when it goes.
 */
export const ObjectSelected: Story = {
  args: {
    items: furnished,
    selectedIds: ['table-2'],
    selectedTable: tableTwo,
    selectedTableCount: 1,
  },
};

/**
 * A table taken out of service.
 *
 * It stays on the plan, keeps its number and is hatched, because it is still a
 * real place in the room. Hiding it would leave the owner rearranging around
 * something they cannot see.
 */
export const TableDisabled: Story = {
  args: {
    items: [
      ...furnished.slice(0, 2),
      roundTable('table-1', 1500, 3000, '1'),
      roundTable('table-2', 3400, 3000, '2', { enabled: false }),
      roundTable('table-3', 5300, 3000, '3', { seats: 6 }),
    ],
    selectedIds: ['table-2'],
    selectedTable: { ...tableTwo, enabled: false },
    selectedTableCount: 1,
  },
};

/**
 * A number another room already holds.
 *
 * The label was refused rather than written, so the table still carries the one
 * it had — which is what the field shows here, because a story sets inputs and
 * types nothing. In the editor the owner's own text stays in the field: the
 * table did not change, so nothing refills it, and a message about text they
 * could no longer see would explain nothing.
 */
export const TableLabelConflict: Story = {
  args: {
    items: furnished,
    selectedIds: ['table-2'],
    selectedTable: tableTwo,
    selectedTableCount: 1,
    labelConflict: { issue: 'duplicate', label: '12' },
    labelConflictRoom: 'Terrace',
  },
};

/**
 * Several selected, so duplicate, delete and bulk numbering are live.
 *
 * The single-item cards are closed: with three tables selected there is no one
 * width and no one number to type into a field, and silently editing whichever
 * came first is worse than doing nothing. Numbering the whole selection is the
 * thing that *does* make sense for many at once, so it takes their place — it
 * is how a room of twenty tables gets its numbers.
 */
export const SelectionOfSeveral: Story = {
  args: {
    items: furnished,
    selectedIds: ['table-1', 'table-2', 'table-3'],
    selectedTableCount: 3,
    canUndo: true,
  },
};

/** Edits made and not written yet, which is the state the save button is for. */
export const UnsavedChanges: Story = {
  args: {
    items: furnished,
    selectedIds: ['table-2'],
    canUndo: true,
    unsavedChanges: true,
  },
};
