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
import { FloorPlanItem, FloorPlanItemVariant } from '../floor-plan-item';

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

let itemNumber = 0;

const object = (
  variant: FloorPlanItemVariant,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
): FloorPlanItem => ({
  id: `object-${(itemNumber += 1)}`,
  kind: 'object',
  variant,
  position: { x, y },
  size: { width, height },
  rotation,
  round: false,
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

const rectangularTable = (
  id: string,
  x: number,
  y: number,
  label: string,
  rotation = 0,
): FloorPlanItem => ({
  id,
  kind: 'table',
  variant: 'table-rectangle',
  position: { x, y },
  size: { width: 1200, height: 800 },
  rotation,
  label,
  round: false,
});

/**
 * A plausible small dining room, so every object type is on screen at once and
 * a change to one of them is visible against the others rather than in
 * isolation.
 */
const furnished: FloorPlanItem[] = [
  object('wall', 2600, 7200, 5200, 120),
  object('door', 6600, 7200, 900, 120),
  object('counter', 1500, 900, 2600, 600),
  object('bar', 7100, 2600, 600, 3000),
  object('blocked', 4200, 4200, 500, 500),
  object('decoration', 7300, 11_200, 500, 500),
  object('chair', 1500, 2250, 450, 450),
  object('chair', 1500, 3750, 450, 450),
  roundTable('table-1', 1500, 3000, '1'),
  roundTable('table-2', 3400, 3000, '2'),
  roundTable('table-3', 5300, 3000, '3'),
  roundTable('table-4', 1500, 5200, '4'),
  roundTable('table-5', 3400, 5200, '5'),
  rectangularTable('table-6', 2200, 9000, '6'),
  rectangularTable('table-7', 5400, 9600, '7', 30),
];

/**
 * Drives a gesture the way a pointer would.
 *
 * The drag and resize states cannot be expressed as inputs: what is on screen
 * mid-gesture is the canvas's own preview, held there and nowhere else so that
 * the plan is written once when the pointer is released. So the story performs
 * the gesture and never lets go, which is exactly the frame the reference is
 * of.
 *
 * The gesture starts at the grip's own centre and moves by a share of the
 * canvas's *height*, which the decorator pins at 480 pixels. The width comes
 * from the browser, and this room is taller than it is wide, so the height is
 * what sets the scale — a delta measured off it is the same number of
 * millimetres however wide the window is.
 */
const drag = async (
  canvasElement: HTMLElement,
  selector: string,
  travel: { x: number; y: number },
): Promise<void> => {
  // Storybook bootstraps the Angular application asynchronously, so the story
  // root is in the DOM before the component under it has rendered once.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );

  const surface = canvasElement.querySelector<SVGSVGElement>(
    '[data-testid="floor-plan-canvas"]',
  );
  const grip = canvasElement.querySelector(selector);

  if (!surface || !grip) {
    return;
  }

  const from = grip.getBoundingClientRect();
  const step = surface.getBoundingClientRect().height;
  const at = (dx: number, dy: number): PointerEventInit => ({
    bubbles: true,
    pointerId: 1,
    clientX: from.left + from.width / 2 + dx * step,
    clientY: from.top + from.height / 2 + dy * step,
  });

  grip.dispatchEvent(new PointerEvent('pointerdown', at(0, 0)));
  surface.dispatchEvent(
    new PointerEvent('pointermove', at(travel.x, travel.y)),
  );
};

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

/**
 * A furnished room: every object type the palette offers, drawn to the scale it
 * is stored at.
 *
 * Tables are painted in the page's own background and everything else in tones
 * of the plan's ink, so the business entities read as objects standing on a
 * floor rather than as more of it.
 */
export const Furnished: Story = {
  args: { items: furnished },
};

/**
 * One table selected.
 *
 * Eight resize handles and a rotate arm, all sized as a share of the viewport
 * so they stay one size on screen at every zoom level.
 */
export const Selected: Story = {
  args: { items: furnished, selectedIds: ['table-2'] },
};

/**
 * Several selected, which is how a room of similar tables gets built.
 *
 * No handles: resizing and rotation are single-item gestures, because eight
 * handles per table across a selection is unreadable and there is no rule yet
 * for what resizing a group does to the spacing inside it.
 */
export const MultipleSelected: Story = {
  args: {
    items: furnished,
    selectedIds: ['table-1', 'table-2', 'table-3'],
  },
};

/**
 * A rotated table, selected.
 *
 * The handles turn with the object, because a resize works in the object's own
 * frame: dragging the east handle of a table standing at 30 degrees grows it
 * along its own length rather than along the room's.
 */
export const Rotated: Story = {
  args: { items: furnished, selectedIds: ['table-7'] },
};

/**
 * Mid-drag: table two has left its stored position and nothing has been written.
 *
 * The grid decides where it is, because snapping applies to the edit in flight
 * and never to the plan on load — the other tables have not moved.
 */
export const Dragging: Story = {
  args: { items: furnished, selectedIds: ['table-2'], snapSpacing: 500 },
  play: ({ canvasElement }) =>
    drag(canvasElement, '[data-item-id="table-2"]', { x: 0.09, y: 0.12 }),
};

/**
 * Mid-resize: the east handle dragged out, with the west edge anchored.
 *
 * That anchor is what makes a resize feel like pulling one side rather than
 * scaling about the middle, and the side lands on the grid rather than the
 * dragged edge, so the table comes out a round number of half-metres.
 */
export const Resizing: Story = {
  args: { items: furnished, selectedIds: ['table-6'], snapSpacing: 500 },
  play: ({ canvasElement }) =>
    drag(canvasElement, '[data-handle="e"]', { x: 0.12, y: 0 }),
};
