import { provideIonicAngular } from '@ionic/angular/standalone';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
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
