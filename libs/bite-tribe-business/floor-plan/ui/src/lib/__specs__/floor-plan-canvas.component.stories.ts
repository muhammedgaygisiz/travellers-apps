import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  applicationConfig,
  componentWrapperDecorator,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { Room } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { FloorPlanCanvasComponent } from '../floor-plan-canvas.component';

addNecessaryIcons();

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 1,
  ...over,
});

export default {
  title: 'Business/Floor Plan Canvas',
  component: FloorPlanCanvasComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
    /*
     * The canvas has no intrinsic height — its `viewBox` is in millimetres and
     * says nothing about pixels — so the surface it is drawn on is given here,
     * in fixed pixels rather than in `vh`, so the visual reference does not
     * move with the runner's window.
     */
    componentWrapperDecorator(
      (story) => `<div style="height: 480px; width: 100%;">${story}</div>`,
    ),
  ],
  args: {
    room: room(),
  },
} as Meta<FloorPlanCanvasComponent>;

type Story = StoryObj<FloorPlanCanvasComponent>;

/**
 * The room the acceptance criteria are written about: 8 m by 12 m, filling the
 * available area at zoom-to-fit and taller than it is wide, so the fit is
 * visibly driven by the height rather than by the container.
 */
export const Default: Story = {};

/**
 * A 4 m by 3 m side room.
 *
 * The same stored millimetres and the same 500 mm grid, drawn larger because
 * there is less of it — which is the whole point of a `viewBox` in physical
 * units. The scale reference drops to a shorter round distance to match.
 */
export const SmallRoom: Story = {
  args: {
    room: room({
      id: 'room-small',
      name: 'Snug',
      size: { width: 4000, height: 3000 },
    }),
  },
};

/**
 * A 30 m by 18 m hall.
 *
 * At this size a 500 mm grid is dense, and the scale reference has moved up its
 * ladder to a distance that still spans about a fifth of the view.
 */
export const LargeRoom: Story = {
  args: {
    room: room({
      id: 'room-large',
      name: 'Banquet hall',
      size: { width: 30_000, height: 18_000 },
    }),
  },
};

/** A wider grid, for a plan an owner wants to lay out in whole metres. */
export const MetreGrid: Story = {
  args: { gridSpacing: 1000 },
};

/** The grid off, which is how the plan prints for the QR sheets. */
export const WithoutGrid: Story = {
  args: { showGrid: false },
};

/**
 * No room to draw.
 *
 * The page renders its own empty state above the canvas, so this is only here
 * to hold the canvas to its half of that: an empty frame with its controls
 * disabled, and nothing that claims to be a plan.
 */
export const Empty: Story = {
  args: { room: undefined },
};
