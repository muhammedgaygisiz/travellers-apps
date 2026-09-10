import { provideIonicAngular } from '@ionic/angular/standalone';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { FloorPlanItem } from 'bite-tribe-business/floor-plan-ui';
import { Room } from 'model';
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

const roundTable = (
  id: string,
  x: number,
  y: number,
  label: string,
): FloorPlanItem => ({
  id,
  kind: 'table',
  variant: 'table-round',
  position: { x, y },
  size: { width: 900, height: 900 },
  rotation: 0,
  label,
  round: true,
});

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
 * One table selected, so the properties panel is open.
 *
 * A round table has one measurement rather than two, and the panel says where
 * its number and its capacity are edited instead — those are issue #1084.
 */
export const ObjectSelected: Story = {
  args: { items: furnished, selectedIds: ['table-2'] },
};

/**
 * Several selected, so duplicate and delete are live and the panel is not.
 *
 * With two tables selected there is no single width to type into a field, so
 * the panel stays closed rather than silently editing whichever came first.
 */
export const SelectionOfSeveral: Story = {
  args: {
    items: furnished,
    selectedIds: ['table-1', 'table-2', 'table-3'],
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
