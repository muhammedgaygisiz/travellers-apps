import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FloorPlanPoint, Room } from 'model';
import { FloorPlanCanvasComponent } from '../floor-plan-canvas.component';
import { FloorPlanItem } from '../floor-plan-item';
import { DEFAULT_GRID_SPACING } from '../floor-plan-grid';
import { MAX_ZOOM, MIN_ZOOM, fitViewportSize } from '../floor-plan-viewport';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 3,
  ...over,
});

/**
 * jsdom implements no `PointerEvent`, and the canvas only ever reads
 * `clientX`, `clientY` and `pointerId` off one — so a `MouseEvent` carrying an
 * id is the same event as far as the component is concerned.
 */
const pointerEvent = (type: string, init: MouseEventInit = {}): PointerEvent =>
  Object.assign(new MouseEvent(type, init), { pointerId: 1 }) as PointerEvent;

const table: FloorPlanItem = {
  id: 'table-1',
  kind: 'table',
  variant: 'table-round',
  position: { x: 2000, y: 2000 },
  size: { width: 900, height: 900 },
  rotation: 0,
  label: '7',
  round: true,
};

const wall: FloorPlanItem = {
  id: 'wall-1',
  kind: 'object',
  variant: 'wall',
  position: { x: 3000, y: 6000 },
  size: { width: 2000, height: 100 },
  rotation: 0,
  round: false,
};

/** `viewBox` is four numbers in one attribute; specs want them apart. */
interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

describe(FloorPlanCanvasComponent.name, () => {
  let component: FloorPlanCanvasComponent;
  let fixture: ComponentFixture<FloorPlanCanvasComponent>;
  let ref: ComponentRef<FloorPlanCanvasComponent>;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const surface = (): SVGSVGElement =>
    fixture.nativeElement.querySelector('[data-testid="floor-plan-canvas"]');

  const viewBox = (): ViewBox => {
    const [x, y, width, height] = (surface().getAttribute('viewBox') ?? '')
      .split(' ')
      .map(Number);

    return { x, y, width, height };
  };

  const query = (testId: string): Element | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorPlanCanvasComponent],
      providers: [provideIonicAngular()],
    })
      .overrideComponent(FloorPlanCanvasComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FloorPlanCanvasComponent);
    ref = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('without a room', () => {
    it('draws no plan and offers no zoom', () => {
      expect(query('floor-plan-room-outline')).toBeNull();
      expect(query('floor-plan-scale')).toBeNull();
      expect(
        query('floor-plan-zoom-in')?.getAttribute('disabled'),
      ).not.toBeNull();
    });

    it('does not move when panned or zoomed', () => {
      const before = viewBox();

      component.zoomIn();
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      fixture.detectChanges();

      expect(viewBox()).toEqual(before);
    });

    /**
     * With nothing drawn there is nothing to zoom, so the wheel is left to the
     * page it is over — an empty canvas that swallowed the scroll would trap it.
     */
    it('leaves the wheel to the page', () => {
      const event = new WheelEvent('wheel', { deltaY: -100 });
      const prevented = jest.spyOn(event, 'preventDefault');

      component.onWheel(event);

      expect(prevented).not.toHaveBeenCalled();
    });

    it('starts no pan gesture', () => {
      component.onPointerDown(
        pointerEvent('pointerdown', { clientX: 10, clientY: 10 }),
      );

      expect(component.panning()).toBe(false);
    });
  });

  describe('with a room', () => {
    beforeEach(() => setInputs({ room: room() }));

    /**
     * The acceptance criterion of issue #1082: a room of 8 m by 12 m renders
     * proportionally and fills the available area at zoom-to-fit. The viewBox
     * is what makes both true — `preserveAspectRatio` does the filling, and
     * these are the numbers it fills with.
     */
    it('fits the room proportionally at zoom-to-fit', () => {
      const fit = fitViewportSize(room().size);
      const box = viewBox();

      expect(box.width).toBeCloseTo(fit.width);
      expect(box.height).toBeCloseTo(fit.height);
      expect(box.width / box.height).toBeCloseTo(8000 / 12_000, 1);
      expect(surface().getAttribute('preserveAspectRatio')).toBe(
        'xMidYMid meet',
      );
    });

    it('draws the room outline at its stored millimetres', () => {
      const outline = query('floor-plan-room-outline');

      expect(outline?.getAttribute('width')).toBe('8000');
      expect(outline?.getAttribute('height')).toBe('12000');
    });

    it('spaces the grid at the millimetres it was given', () => {
      const pattern = fixture.nativeElement.querySelector('pattern');

      expect(pattern?.getAttribute('width')).toBe(String(DEFAULT_GRID_SPACING));

      setInputs({ gridSpacing: 1000 });

      expect(
        fixture.nativeElement.querySelector('pattern')?.getAttribute('width'),
      ).toBe('1000');
    });

    it('hides the grid without touching the plan', () => {
      const before = viewBox();

      setInputs({ showGrid: false });

      expect(query('floor-plan-grid')).toBeNull();
      expect(query('floor-plan-room-outline')).not.toBeNull();
      expect(viewBox()).toEqual(before);
    });

    it('shows less of the plan when zoomed in and more when zoomed out', () => {
      const fit = viewBox();

      component.zoomIn();
      fixture.detectChanges();
      expect(viewBox().width).toBeLessThan(fit.width);

      component.zoomOut();
      component.zoomOut();
      fixture.detectChanges();
      expect(viewBox().width).toBeGreaterThan(fit.width);
    });

    it('stops zooming at the bounds', () => {
      for (let step = 0; step < 30; step += 1) {
        component.zoomIn();
      }
      fixture.detectChanges();

      const fit = fitViewportSize(room().size);

      expect(viewBox().width).toBeCloseTo(fit.width / MAX_ZOOM);

      for (let step = 0; step < 60; step += 1) {
        component.zoomOut();
      }
      fixture.detectChanges();

      expect(viewBox().width).toBeCloseTo(fit.width / MIN_ZOOM);
    });

    it('pans with the arrow keys and returns to the fit on zero', () => {
      const fit = viewBox();

      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      fixture.detectChanges();
      expect(viewBox().x).toBeGreaterThan(fit.x);

      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();
      expect(viewBox().y).toBeGreaterThan(fit.y);

      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      fixture.detectChanges();
      expect(viewBox()).toEqual(fit);

      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      component.onKeyDown(new KeyboardEvent('keydown', { key: '0' }));
      fixture.detectChanges();
      expect(viewBox()).toEqual(fit);
    });

    /**
     * `+` and `=` are the same physical key on most layouts, and an owner
     * pressing it without shift means zoom in rather than nothing.
     */
    it.each([['+'], ['=']])('zooms in on %s', (key) => {
      const fit = viewBox();

      component.onKeyDown(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();

      expect(viewBox().width).toBeLessThan(fit.width);
    });

    it('zooms out on minus', () => {
      const fit = viewBox();

      component.onKeyDown(new KeyboardEvent('keydown', { key: '-' }));
      fixture.detectChanges();

      expect(viewBox().width).toBeGreaterThan(fit.width);
    });

    it('ignores a key it has no answer for', () => {
      const before = viewBox();
      const event = new KeyboardEvent('keydown', { key: 'k' });
      const prevented = jest.spyOn(event, 'preventDefault');

      component.onKeyDown(event);
      fixture.detectChanges();

      expect(viewBox()).toEqual(before);
      expect(prevented).not.toHaveBeenCalled();
    });

    it('never pans the plan off the canvas', () => {
      for (let step = 0; step < 40; step += 1) {
        component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      }
      fixture.detectChanges();

      // The centre is clamped to the floor, so the room's left edge stays in
      // the right half of what is visible rather than disappearing past it.
      const box = viewBox();

      expect(box.x + box.width).toBeGreaterThan(0);
    });

    it('drags the plan under the pointer', () => {
      // jsdom lays nothing out, so the element reports the size a browser
      // would have measured. Without it there is no millimetre-per-pixel scale
      // and the canvas correctly refuses to pan.
      surface().getBoundingClientRect = (): DOMRect =>
        ({ width: 600, height: 900 }) as DOMRect;

      const fit = viewBox();

      component.onPointerDown(
        pointerEvent('pointerdown', { clientX: 300, clientY: 450 }),
      );
      expect(component.panning()).toBe(true);

      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 200, clientY: 450 }),
      );
      fixture.detectChanges();

      // Dragging left moves the viewport right, so the plan follows the hand.
      expect(viewBox().x).toBeGreaterThan(fit.x);

      component.onPointerUp();
      expect(component.panning()).toBe(false);
    });

    it('shrugs off a release for a gesture that never started', () => {
      const before = viewBox();

      expect(() => component.onPointerUp()).not.toThrow();
      expect(component.panning()).toBe(false);
      expect(viewBox()).toEqual(before);
    });

    it('does not pan on a move that never started with a press', () => {
      const before = viewBox();

      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 10, clientY: 10 }),
      );
      fixture.detectChanges();

      expect(viewBox()).toEqual(before);
    });

    it('zooms on the wheel and keeps the page from scrolling instead', () => {
      const fit = viewBox();
      const event = new WheelEvent('wheel', { deltaY: -100 });
      const prevented = jest.spyOn(event, 'preventDefault');

      component.onWheel(event);
      fixture.detectChanges();

      expect(viewBox().width).toBeLessThan(fit.width);
      expect(prevented).toHaveBeenCalled();
    });

    it('zooms out when the wheel turns the other way', () => {
      const fit = viewBox();

      component.onWheel(new WheelEvent('wheel', { deltaY: 100 }));
      fixture.detectChanges();

      expect(viewBox().width).toBeGreaterThan(fit.width);
    });

    /** A trackpad emits horizontal-only wheel events, which are not a zoom. */
    it('ignores a wheel event with no vertical travel', () => {
      const fit = viewBox();

      component.onWheel(new WheelEvent('wheel', { deltaY: 0, deltaX: 40 }));
      fixture.detectChanges();

      expect(viewBox()).toEqual(fit);
    });

    /**
     * jsdom lays nothing out, so the element reports no size and there is no
     * millimetre-per-pixel scale to pan by. Refusing beats panning by a
     * garbage factor.
     */
    it('does not pan while the canvas has no measured size', () => {
      const before = viewBox();

      component.onPointerDown(
        pointerEvent('pointerdown', { clientX: 300, clientY: 450 }),
      );
      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 100, clientY: 450 }),
      );
      fixture.detectChanges();

      expect(viewBox()).toEqual(before);
    });

    /**
     * The acceptance criterion that pan and zoom change no stored field. The
     * canvas cannot write — this library may not import `type:data-access` —
     * and this asserts it does not mutate what it was handed either.
     */
    it('leaves the room it was given untouched', () => {
      const given = room();
      const snapshot = JSON.parse(JSON.stringify(given));

      setInputs({ room: given });

      component.zoomIn();
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      component.zoomToFit();
      fixture.detectChanges();

      expect(given).toEqual(snapshot);
      expect(given.version).toBe(3);
    });

    it('keeps the viewport across a save, and refits when the room resizes', () => {
      component.zoomIn();
      fixture.detectChanges();
      const zoomed = viewBox();

      // A save returns a new object at the next version. The pan survives it.
      setInputs({ room: room({ version: 4, name: 'Terrace' }) });
      expect(viewBox()).toEqual(zoomed);

      // New dimensions make the old viewport wrong, so it refits.
      setInputs({ room: room({ size: { width: 20_000, height: 20_000 } }) });
      const refit = fitViewportSize({ width: 20_000, height: 20_000 });
      expect(viewBox().width).toBeCloseTo(refit.width);
    });

    it('carries a scale reference labelled in metres', () => {
      const scale = query('floor-plan-scale');

      expect(scale).not.toBeNull();
      expect(scale?.textContent?.trim()).toMatch(/^[\d.]+ m$/);
    });
  });

  describe('with objects in the room', () => {
    let selections: string[][];
    let changed: FloorPlanItem[][];
    let commands: string[];
    let placements: { variant: string; position: FloorPlanPoint }[];

    /**
     * The room is 8 m by 12 m, so the fitted viewBox is 8960 by 12 960 and an
     * element of 800 by 1200 device pixels maps one pixel to 11.2 mm. Every
     * client coordinate below is chosen against that scale, because jsdom lays
     * nothing out and the canvas correctly refuses to work without a measured
     * element.
     */
    const measure = (): void => {
      surface().getBoundingClientRect = (): DOMRect =>
        ({ width: 800, height: 1200, left: 0, top: 0 }) as DOMRect;
    };

    const press = (testId: string, init: MouseEventInit = {}): void => {
      const target = query(testId) ?? surface();

      target.dispatchEvent(
        pointerEvent('pointerdown', { bubbles: true, ...init }),
      );
    };

    const itemElement = (id: string): Element | null =>
      fixture.nativeElement.querySelector(`[data-item-id="${id}"]`);

    beforeEach(() => {
      selections = [];
      changed = [];
      commands = [];
      placements = [];

      setInputs({ room: room(), items: [table, wall], snapSpacing: 500 });

      component.selectionChange.subscribe((ids) => selections.push(ids));
      component.itemsChange.subscribe((items) => changed.push(items));
      component.commandRequest.subscribe((name) => commands.push(name));
      component.placeRequest.subscribe((place) => placements.push(place));

      measure();
    });

    it('draws every item with a class naming what it is', () => {
      expect(itemElement('table-1')?.getAttribute('class')).toContain(
        'floor-plan-canvas__item--table-round',
      );
      expect(itemElement('wall-1')?.getAttribute('class')).toContain(
        'floor-plan-canvas__item--wall',
      );
    });

    /**
     * The acceptance criterion that rotation is a number in the model rather
     * than a transform string. The transform is a rendering detail derived from
     * the field, and it turns the shape about its own centre.
     */
    it('turns an item about its own centre from its degrees', () => {
      setInputs({ items: [{ ...wall, rotation: 45 }] });

      expect(itemElement('wall-1')?.getAttribute('transform')).toBe(
        'rotate(45 3000 6000)',
      );
    });

    it('draws a round table as a circle and a wall as a rectangle', () => {
      expect(itemElement('table-1')?.querySelector('circle')).not.toBeNull();
      expect(itemElement('wall-1')?.querySelector('rect')).not.toBeNull();
    });

    it('selects the item a pointer goes down on', () => {
      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 600,
        }),
      );

      expect(selections).toEqual([['wall-1']]);
    });

    it('adds to the selection when shift is held', () => {
      setInputs({ selectedIds: ['table-1'] });

      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          shiftKey: true,
          clientX: 400,
          clientY: 600,
        }),
      );

      expect(selections).toEqual([['table-1', 'wall-1']]);
    });

    it('takes an already selected item back out on a shift-press', () => {
      setInputs({ selectedIds: ['table-1', 'wall-1'] });

      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          shiftKey: true,
          clientX: 400,
          clientY: 600,
        }),
      );

      expect(selections).toEqual([['table-1']]);
    });

    /** So a group can be dragged by any of its members. */
    it('keeps a group selected when one of its members is pressed', () => {
      setInputs({ selectedIds: ['table-1', 'wall-1'] });

      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 600,
        }),
      );

      expect(selections).toEqual([['table-1', 'wall-1']]);
    });

    it('clears the selection when the bare floor is pressed', () => {
      setInputs({ selectedIds: ['wall-1'] });

      press('floor-plan-canvas', { clientX: 10, clientY: 10 });

      expect(selections).toEqual([[]]);
      expect(component.panning()).toBe(true);
    });

    /**
     * The acceptance criterion that a drag rewrites nothing until it ends: one
     * gesture is one emission, whatever it passed over on the way.
     */
    it('reports a drag once, when the pointer is released', () => {
      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 600,
        }),
      );
      setInputs({ selectedIds: ['wall-1'] });

      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 420, clientY: 600 }),
      );
      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 450, clientY: 620 }),
      );

      expect(changed).toHaveLength(0);

      component.onPointerUp();

      expect(changed).toHaveLength(1);
      expect(changed[0]).toHaveLength(1);
      expect(changed[0][0].id).toBe('wall-1');
    });

    it('lands a drag on the grid it was given', () => {
      // Alone in the room, so the only edges in range are the walls it is
      // nowhere near and the grid is the thing that decides.
      setInputs({ items: [wall] });

      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 600,
        }),
      );
      setInputs({ selectedIds: ['wall-1'] });

      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 460, clientY: 600 }),
      );
      component.onPointerUp();

      expect(changed[0][0].position.x % 500).toBe(0);
    });

    /** Selecting is not a mutation, so a press and release reports nothing. */
    it('reports nothing for a click that never moved', () => {
      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 600,
        }),
      );
      component.onPointerUp();

      expect(changed).toHaveLength(0);
    });

    it('abandons a gesture on escape without reporting it', () => {
      itemElement('wall-1')?.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 600,
        }),
      );
      setInputs({ selectedIds: ['wall-1'] });

      component.onPointerMove(
        pointerEvent('pointermove', { clientX: 500, clientY: 700 }),
      );
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      component.onPointerUp();

      expect(changed).toHaveLength(0);
      expect(selections).toEqual([['wall-1']]);
    });

    it('clears the selection on escape when no gesture is in flight', () => {
      setInputs({ selectedIds: ['wall-1'] });

      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(selections).toEqual([[]]);
    });

    describe('the handles', () => {
      it('appear for one selected item and not for two', () => {
        setInputs({ selectedIds: ['wall-1'] });
        expect(query('floor-plan-handles')).not.toBeNull();

        setInputs({ selectedIds: ['wall-1', 'table-1'] });
        expect(query('floor-plan-handles')).toBeNull();

        setInputs({ selectedIds: [] });
        expect(query('floor-plan-handles')).toBeNull();
      });

      it('turn with the item they belong to', () => {
        setInputs({
          items: [{ ...wall, rotation: 30 }],
          selectedIds: ['wall-1'],
        });

        expect(query('floor-plan-handles')?.getAttribute('transform')).toBe(
          'rotate(30 3000 6000)',
        );
      });

      it('resize from a corner and report the new size once', () => {
        setInputs({ selectedIds: ['wall-1'] });

        press('floor-plan-handle-e', { clientX: 400, clientY: 600 });
        component.onPointerMove(
          pointerEvent('pointermove', { clientX: 500, clientY: 600 }),
        );
        component.onPointerUp();

        expect(changed).toHaveLength(1);
        expect(changed[0][0].size.width).toBeGreaterThan(wall.size.width);
      });

      it('rotate from the rotate handle, in whole degrees', () => {
        setInputs({ selectedIds: ['wall-1'] });

        press('floor-plan-handle-rotate', { clientX: 400, clientY: 400 });
        component.onPointerMove(
          pointerEvent('pointermove', { clientX: 700, clientY: 600 }),
        );
        component.onPointerUp();

        const rotation = changed[0][0].rotation;

        expect(Number.isInteger(rotation)).toBe(true);
        expect(rotation).toBeGreaterThan(0);
        expect(rotation).toBeLessThan(360);
      });
    });

    describe('the keyboard', () => {
      beforeEach(() => setInputs({ selectedIds: ['wall-1'] }));

      it('nudges the selection by one grid cell instead of panning', () => {
        const before = viewBox();

        component.onKeyDown(
          new KeyboardEvent('keydown', { key: 'ArrowRight' }),
        );

        expect(viewBox()).toEqual(before);
        expect(changed[0][0].position.x).toBe(wall.position.x + 500);
      });

      it('nudges further with shift held', () => {
        component.onKeyDown(
          new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }),
        );

        expect(changed[0][0].position.x).toBe(wall.position.x + 2500);
      });

      it('pans again once nothing is selected', () => {
        setInputs({ selectedIds: [] });
        const before = viewBox();

        component.onKeyDown(
          new KeyboardEvent('keydown', { key: 'ArrowRight' }),
        );
        fixture.detectChanges();

        expect(viewBox().x).toBeGreaterThan(before.x);
        expect(changed).toHaveLength(0);
      });

      it.each([['Delete'], ['Backspace']])('deletes on %s', (key) => {
        component.onKeyDown(new KeyboardEvent('keydown', { key }));

        expect(commands).toEqual(['delete']);
      });

      it.each([
        [{ key: 'z', ctrlKey: true }, 'undo'],
        [{ key: 'z', metaKey: true }, 'undo'],
        [{ key: 'z', ctrlKey: true, shiftKey: true }, 'redo'],
        [{ key: 'y', ctrlKey: true }, 'redo'],
        [{ key: 'd', ctrlKey: true }, 'duplicate'],
        [{ key: 'a', ctrlKey: true }, 'select-all'],
      ])('asks the editor for %p', (init, expected) => {
        component.onKeyDown(new KeyboardEvent('keydown', init));

        expect(commands).toEqual([expected]);
      });
    });

    describe('placing from the palette', () => {
      const dropEvent = (variant: string, init: MouseEventInit): DragEvent =>
        Object.assign(new MouseEvent('drop', init), {
          dataTransfer: { getData: (): string => variant, dropEffect: '' },
        }) as unknown as DragEvent;

      it('places the dragged entry at the millimetre under the pointer', () => {
        component.onDrop(dropEvent('chair', { clientX: 400, clientY: 600 }));

        expect(placements).toHaveLength(1);
        expect(placements[0].variant).toBe('chair');
        expect(placements[0].position.x).toBeCloseTo(4000, 0);
        expect(placements[0].position.y).toBeCloseTo(6000, 0);
      });

      it('ignores a drop carrying nothing it can place', () => {
        component.onDrop(dropEvent('', { clientX: 400, clientY: 600 }));

        expect(placements).toHaveLength(0);
      });

      /** The default action of `dragover` is to refuse the drop. */
      it('accepts a drag passing over the plan', () => {
        const event = Object.assign(new MouseEvent('dragover'), {
          dataTransfer: { dropEffect: '' },
        }) as unknown as DragEvent;
        const prevented = jest.spyOn(event, 'preventDefault');

        component.onDragOver(event);

        expect(prevented).toHaveBeenCalled();
      });
    });

    /**
     * The canvas cannot write, and this asserts it does not mutate what it was
     * handed either: a gesture reports new items rather than editing the old.
     */
    it('leaves the items it was given untouched', () => {
      const given = [{ ...wall }];
      const snapshot = JSON.parse(JSON.stringify(given));

      setInputs({ items: given, selectedIds: ['wall-1'] });

      component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(given).toEqual(snapshot);
    });
  });
});
