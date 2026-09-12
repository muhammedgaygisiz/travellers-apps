import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FloorPlanPoint, Room } from 'model';
import { FloorPlanCanvasComponent } from '../floor-plan-canvas.component';
import { FloorPlanItem } from '../floor-plan-item';
import { DEFAULT_GRID_SPACING } from '../floor-plan-grid';
import { MAX_ZOOM, MIN_ZOOM, fitViewportSize } from '../floor-plan-viewport';

/**
 * Renders the key, and the parameters after it where there are any.
 *
 * The accessible name of an object is a key *and* what is interpolated into
 * it - a table's number, its capacity - so a mock that dropped the parameters
 * would let a name that says nothing about the table pass.
 */
@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params === undefined ? value : `${value} ${JSON.stringify(params)}`;
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

/** What the canvas reads off a `ResizeObserver` entry. */
interface SizeEntry {
  contentRect: { width: number; height: number };
}

/**
 * jsdom implements no `ResizeObserver` and lays nothing out to observe, so the
 * canvas skips it entirely there. Installing this one is what puts the measured
 * path - the only pixel measurement the scale bar has - under test.
 */
let observers: ((entries: SizeEntry[]) => void)[] = [];

class FakeResizeObserver {
  constructor(callback: (entries: SizeEntry[]) => void) {
    observers.push(callback);
  }

  observe(): void {
    /* nothing to watch: the spec fires the callback itself */
  }

  disconnect(): void {
    /* nothing to release */
  }
}

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
    observers = [];
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      FakeResizeObserver;

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

    describe('the scale reference', () => {
      const bar = (): HTMLElement | null =>
        fixture.nativeElement.querySelector('.floor-plan-canvas__scale-bar');

      const measure = (width: number, height: number): void => {
        observers.forEach((notify) =>
          notify([{ contentRect: { width, height } }]),
        );
        fixture.detectChanges();
      };

      it('is labelled in metres', () => {
        const scale = query('floor-plan-scale');

        expect(scale).not.toBeNull();
        expect(scale?.textContent?.trim()).toMatch(/^[\d.]+ m$/);
      });

      /**
       * It is pinned to the element rather than drawn on the plan, because the
       * letterbox it stands in is outside the viewBox. Drawn in millimetres it
       * straddled the room's bottom-left corner with its label on the wall.
       */
      it('is drawn outside the plan, not in it', () => {
        expect(
          surface().querySelector('[data-testid="floor-plan-scale"]'),
        ).toBeNull();
        expect(query('floor-plan-scale')).not.toBeNull();
      });

      /**
       * The room is 8 m by 12 m, so the fitted viewBox is 8960 by 12 960. An
       * element of 800 by 1200 fits it by width, one pixel covering 11.2 mm, so
       * the round metre the bar settles on is 89 pixels wide.
       */
      it('is as wide on screen as the distance it claims', () => {
        measure(800, 1200);

        expect(parseFloat(bar()?.style.width ?? '')).toBeCloseTo(
          1000 / 11.2,
          0,
        );
        expect(query('floor-plan-scale')?.textContent?.trim()).toBe('1 m');
      });

      it('grows as the plan is zoomed into', () => {
        measure(800, 1200);
        const fitted = parseFloat(bar()?.style.width ?? '');

        component.zoomIn();
        fixture.detectChanges();

        expect(parseFloat(bar()?.style.width ?? '')).toBeGreaterThan(fitted);
      });

      /** A bar of no width is honest about not knowing the scale yet. */
      it('has no width before the element has been measured', () => {
        expect(parseFloat(bar()?.style.width ?? '0')).toBe(0);
        expect(query('floor-plan-scale')?.textContent?.trim()).toMatch(
          /^[\d.]+ m$/,
        );
      });
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
     * Selection used to be a hue and nothing else (GitHub issue #1089), which
     * says nothing in greyscale - on a printed plan, or to an owner who does
     * not separate blue from grey. The dashed outline that might have carried
     * it is drawn only around a single selected item, so a selected group said
     * nothing at all.
     */
    it('draws a selected item with a heavier line as well as another colour', () => {
      const strokeOf = (id: string): number =>
        Number(
          itemElement(id)
            ?.querySelector('rect, circle')
            ?.getAttribute('stroke-width'),
        );

      setInputs({ selectedIds: ['table-1'] });

      expect(strokeOf('table-1')).toBeGreaterThan(strokeOf('wall-1'));
    });

    describe('what a table says about itself', () => {
      const labelOf = (id: string): string =>
        itemElement(id)
          ?.querySelector('.floor-plan-canvas__item-label')
          ?.textContent?.trim() ?? '';

      const seatsOf = (id: string): string =>
        itemElement(id)
          ?.querySelector('.floor-plan-canvas__item-seats text')
          ?.textContent?.trim() ?? '';

      /**
       * Digits behind a figure, not a sentence: a 900 mm round table is about
       * three characters wide at zoom-to-fit, so "4 seats" written across one
       * runs off both sides. The words are in the `<title>`, where a hover and
       * a screen reader both find them.
       */
      it('draws the table number and the capacity under it', () => {
        setInputs({ items: [{ ...table, seats: 4 }] });

        expect(labelOf('table-1')).toBe('7');
        expect(seatsOf('table-1')).toBe('4');
        expect(
          itemElement('table-1')?.querySelector('title')?.textContent,
        ).toContain('floor-plan-table-seats-count');
      });

      it('keeps the figure and the digits centred on the table together', () => {
        setInputs({ items: [{ ...table, seats: 4 }] });
        const single = component.itemViews()[0];

        setInputs({ items: [{ ...table, seats: 12 }] });
        const double = component.itemViews()[0];

        // A wider capacity pushes the figure left rather than sliding the pair
        // off to one side of the table it is supposed to be written on.
        expect(double.seatHeadX).toBeLessThan(single.seatHeadX);
        expect(double.seatsTextX).toBeLessThan(single.seatsTextX);
      });

      it('draws the seated figure beside the digits', () => {
        setInputs({ items: [{ ...table, seats: 4 }] });
        const group = itemElement('table-1')?.querySelector(
          '.floor-plan-canvas__item-seats',
        );

        expect(group?.querySelector('circle')).not.toBeNull();
        expect(group?.querySelector('path')?.getAttribute('d')).toContain('M ');
      });

      /**
       * The number is a share of the viewport rather than a pixel size, which
       * is what keeps it legible at zoom-to-fit — the zoom level the acceptance
       * criterion names — as well as zoomed in.
       */
      it('sizes the number against the viewport, and the capacity under it', () => {
        setInputs({ items: [{ ...table, seats: 4 }] });

        const view = component.itemViews()[0];

        expect(view.labelSize).toBeCloseTo(component.viewport().height * 0.03);
        expect(view.seatsSize).toBeLessThan(view.labelSize);
      });

      it('centres a number that stands alone and lifts one with a capacity under it', () => {
        setInputs({ items: [{ ...table, seats: undefined }] });
        expect(component.itemViews()[0].labelY).toBe(2000);

        setInputs({ items: [{ ...table, seats: 4 }] });
        expect(component.itemViews()[0].labelY).toBeLessThan(2000);
        expect(component.itemViews()[0].seatsY).toBeGreaterThan(2000);
      });

      it('writes no number and no capacity on geometry', () => {
        expect(labelOf('wall-1')).toBe('');
        expect(seatsOf('wall-1')).toBe('');
      });

      /**
       * A disabled table stays in the plan and is drawn differently: it is a
       * real place in the room that is not taking guests.
       */
      it('marks a table that is out of service without removing it', () => {
        setInputs({ items: [{ ...table, seats: 4, enabled: false }] });

        expect(itemElement('table-1')).not.toBeNull();
        expect(itemElement('table-1')?.getAttribute('class')).toContain(
          'floor-plan-canvas__item--disabled',
        );
      });

      it('marks a table in service as ordinary', () => {
        setInputs({ items: [{ ...table, seats: 4, enabled: true }] });

        expect(itemElement('table-1')?.getAttribute('class')).not.toContain(
          'floor-plan-canvas__item--disabled',
        );
      });
    });

    /**
     * What the plan says to somebody who cannot see it (GitHub issue #1089).
     *
     * A shape with no accessible name is announced as nothing at all, so a plan
     * a screen reader walked through used to be a row of identical silences.
     */
    describe('the accessible name of an object', () => {
      const nameOf = (id: string): string =>
        itemElement(id)?.getAttribute('aria-label') ?? '';

      it('names a table by its number and its capacity', () => {
        setInputs({ items: [{ ...table, seats: 4 }] });

        expect(nameOf('table-1')).toContain('floor-plan-item-table');
        expect(nameOf('table-1')).toContain('"label":"7"');
        expect(nameOf('table-1')).toContain('"seats":4');
        expect(nameOf('table-1')).toContain(
          '"type":"floor-plan-object-table-round"',
        );
      });

      it('says when a table is out of service', () => {
        setInputs({ items: [{ ...table, seats: 4, enabled: false }] });

        expect(nameOf('table-1')).toContain('floor-plan-item-table-disabled');
      });

      /**
       * The label is a fragment rather than an empty string, because a table
       * can be left without a number - the editor refuses to publish it, and
       * says so - and "Round table , 4 seats" is a sentence with a hole in it.
       */
      it('says so when a table has no number yet', () => {
        setInputs({ items: [{ ...table, seats: 4, label: '' }] });

        expect(nameOf('table-1')).toContain(
          '"label":"floor-plan-item-unnumbered"',
        );
      });

      /** Geometry is named by what it is, which is all there is to say. */
      it('names geometry by its type', () => {
        expect(nameOf('wall-1')).toContain('floor-plan-object-wall');
        expect(nameOf('wall-1')).not.toContain('floor-plan-item-table');
      });

      it('is what the canvas points at while the object is selected', () => {
        setInputs({ selectedIds: ['wall-1'] });

        const active = surface().getAttribute('aria-activedescendant');

        expect(active).not.toBeNull();
        expect(itemElement('wall-1')?.getAttribute('id')).toBe(active);
      });

      it('points at the last of several, and at nothing when none', () => {
        setInputs({ selectedIds: ['wall-1', 'table-1'] });

        expect(surface().getAttribute('aria-activedescendant')).toBe(
          itemElement('table-1')?.getAttribute('id'),
        );

        setInputs({ selectedIds: [] });

        expect(surface().getAttribute('aria-activedescendant')).toBeNull();
      });
    });

    /**
     * Selecting without a pointer (GitHub issue #1089).
     *
     * Every other mutation already had a keyboard path and every one of them
     * needs something selected first, so this is what makes the editor usable
     * without a mouse rather than merely operable.
     */
    describe('walking the plan with tab', () => {
      const tab = (shiftKey = false): KeyboardEvent => {
        const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey });

        jest.spyOn(event, 'preventDefault');
        component.onKeyDown(event);

        return event;
      };

      it('starts at the first object and walks forwards', () => {
        tab();

        expect(selections).toEqual([['table-1']]);

        setInputs({ selectedIds: ['table-1'] });
        tab();

        expect(selections[1]).toEqual(['wall-1']);
      });

      it('walks backwards with shift held', () => {
        setInputs({ selectedIds: ['wall-1'] });
        tab(true);

        expect(selections).toEqual([['table-1']]);
      });

      /**
       * The end of the plan is the end of the tab stop: the selection is
       * dropped and the key is left alone, so the focus moves on to the next
       * control. A canvas that cycled for ever would be a keyboard trap.
       */
      it('lets go of the key after the last object', () => {
        setInputs({ selectedIds: ['wall-1'] });

        const event = tab();

        expect(selections).toEqual([[]]);
        expect(event.preventDefault).not.toHaveBeenCalled();
      });

      it('lets go backwards before the first object', () => {
        setInputs({ selectedIds: ['table-1'] });

        const event = tab(true);

        expect(selections).toEqual([[]]);
        expect(event.preventDefault).not.toHaveBeenCalled();
      });

      /** Nothing is selected and there is nothing behind, so it is a plain tab. */
      it('leaves backwards from an untouched plan', () => {
        const event = tab(true);

        expect(selections).toEqual([]);
        expect(event.preventDefault).not.toHaveBeenCalled();
      });

      it('leaves from the edge of a selection of several', () => {
        setInputs({ selectedIds: ['table-1', 'wall-1'] });
        tab(true);

        expect(selections).toEqual([[]]);
      });

      /**
       * A pointer can only press what is on screen, so selecting used to imply
       * seeing. Tabbing does not, and nudging a table nobody can see is not an
       * edit an owner can check.
       */
      it('brings an object outside the view into it', () => {
        component.zoomIn();
        component.zoomIn();
        component.zoomIn();
        fixture.detectChanges();

        const before = viewBox();

        expect(table.position.y).toBeLessThan(before.y);

        setInputs({ selectedIds: ['wall-1'] });
        tab(true);
        fixture.detectChanges();

        const after = viewBox();

        expect(table.position.y).toBeGreaterThan(after.y);
        expect(table.position.y).toBeLessThan(after.y + after.height);
      });

      it('leaves the view alone for an object already on screen', () => {
        const before = viewBox();

        setInputs({ selectedIds: ['table-1'] });
        tab();
        fixture.detectChanges();

        expect(viewBox()).toEqual(before);
      });
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

    /**
     * The live view staff open during service (GitHub issue #1093).
     *
     * The same drawing and none of the same gestures: the plan is the published
     * one, so a press that would move a table moves the *view*, and a table is
     * picked by tapping it rather than by dragging it somewhere.
     */
    describe('read-only', () => {
      let selections: string[][];
      let changes: FloorPlanItem[][];
      let commands: string[];
      let holds: string[];

      /** A pointer event that reaches the surface by bubbling, as a real one does. */
      const at = (
        type: string,
        pointerId: number,
        init: MouseEventInit,
        element: Element = surface(),
      ): void => {
        element.dispatchEvent(
          Object.assign(new MouseEvent(type, { bubbles: true, ...init }), {
            pointerId,
          }) as unknown as PointerEvent,
        );
      };

      beforeEach(() => {
        selections = [];
        changes = [];
        commands = [];
        holds = [];

        component.selectionChange.subscribe((ids) => selections.push(ids));
        component.itemsChange.subscribe((items) => changes.push(items));
        component.commandRequest.subscribe((command) => commands.push(command));
        component.longPress.subscribe((id) => holds.push(id));

        setInputs({ readOnly: true, items: [table, wall] });
      });

      /** A press that stayed put picked the table it stayed on. */
      it('selects the table a tap landed on', () => {
        at(
          'pointerdown',
          1,
          { clientX: 100, clientY: 100 },
          itemElement('table-1') as Element,
        );
        at('pointerup', 1, {});

        expect(selections).toEqual([['table-1']]);
      });

      /** A tap on bare floor puts the detail panel away again. */
      it('clears the selection on a tap beside the tables', () => {
        at('pointerdown', 1, { clientX: 10, clientY: 10 });
        at('pointerup', 1, {});

        expect(selections).toEqual([[]]);
      });

      /**
       * The same press, once it has travelled: the plan was dragged into view
       * and nothing was picked. Without this a host could not pan a room whose
       * tables cover most of it.
       */
      it('pans instead of selecting once the press has travelled', () => {
        at(
          'pointerdown',
          1,
          { clientX: 100, clientY: 100 },
          itemElement('table-1') as Element,
        );
        at('pointermove', 1, { clientX: 400, clientY: 380 });
        at('pointerup', 1, {});

        expect(selections).toEqual([]);
        expect(changes).toEqual([]);
      });

      /** Nothing on this view can change the plan, by pointer or by key. */
      it('never reports a geometry change or an editor command', () => {
        setInputs({ selectedIds: ['table-1'] });

        component.onKeyDown(
          new KeyboardEvent('keydown', { key: 'ArrowRight' }),
        );
        component.onKeyDown(new KeyboardEvent('keydown', { key: 'Delete' }));
        component.onKeyDown(
          new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
        );
        component.onKeyDown(
          new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }),
        );

        expect(changes).toEqual([]);
        expect(commands).toEqual([]);
      });

      it('refuses a dropped palette entry', () => {
        const event = Object.assign(new MouseEvent('drop'), {
          dataTransfer: { getData: (): string => 'chair' },
        }) as unknown as DragEvent;
        const prevented = jest.spyOn(event, 'preventDefault');
        const placements: unknown[] = [];

        component.placeRequest.subscribe((placement) =>
          placements.push(placement),
        );
        component.onDrop(event);

        expect(placements).toEqual([]);
        expect(prevented).not.toHaveBeenCalled();
      });

      /** No resize or rotate grips, because neither gesture exists here. */
      it('draws no handles around the selected table', () => {
        setInputs({ selectedIds: ['table-1'] });

        expect(query('floor-plan-handles')).toBeNull();
      });

      /**
       * Enter is the keyboard's long press. The canvas is one tab stop with
       * `aria-activedescendant` on it, so there is nothing focused to click and
       * without this the table's actions would be reachable by touch and by
       * pointer and by neither of the keys a keyboard user tries first.
       */
      it('raises a hold from the keyboard', () => {
        setInputs({ selectedIds: ['table-1'] });

        component.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(holds).toEqual(['table-1']);
      });

      it('raises a hold from a right-click and opens no browser menu', () => {
        const event = new MouseEvent('contextmenu', { bubbles: true });
        const prevented = jest.spyOn(event, 'preventDefault');

        itemElement('table-1')?.dispatchEvent(event);

        expect(prevented).toHaveBeenCalled();
        expect(holds).toEqual(['table-1']);
        expect(selections).toEqual([['table-1']]);
      });

      /** The editor keeps the browser's own menu, which it always had. */
      it('leaves the context menu alone in the editor', () => {
        setInputs({ readOnly: false });

        const event = new MouseEvent('contextmenu', { bubbles: true });
        const prevented = jest.spyOn(event, 'preventDefault');

        itemElement('table-1')?.dispatchEvent(event);

        expect(prevented).not.toHaveBeenCalled();
        expect(holds).toEqual([]);
      });

      /**
       * Two fingers spread apart zoom in. The gesture the whole responsive
       * scope of issue #1093 turns on: a host holding a tablet zooms with a
       * pinch, not with a button in the corner.
       */
      it('zooms in on a pinch opened', () => {
        const before = viewBox().width;

        at('pointerdown', 1, { clientX: 100, clientY: 100 });
        at('pointerdown', 2, { clientX: 200, clientY: 100 });
        at('pointermove', 2, { clientX: 400, clientY: 100 });
        fixture.detectChanges();

        expect(viewBox().width).toBeLessThan(before);
      });

      it('zooms out on a pinch closed', () => {
        const before = viewBox().width;

        at('pointerdown', 1, { clientX: 100, clientY: 100 });
        at('pointerdown', 2, { clientX: 500, clientY: 100 });
        at('pointermove', 2, { clientX: 200, clientY: 100 });
        fixture.detectChanges();

        expect(viewBox().width).toBeGreaterThan(before);
      });

      /**
       * A second finger landing cancels whatever one was doing, so a pinch
       * begun with a thumb resting on a table leaves the table where it was and
       * selects nothing when the fingers come off.
       */
      it('abandons the press a second finger interrupts', () => {
        at(
          'pointerdown',
          1,
          { clientX: 100, clientY: 100 },
          itemElement('table-1') as Element,
        );
        at('pointerdown', 2, { clientX: 200, clientY: 100 });
        at('pointerup', 2, {});
        at('pointerup', 1, {});

        expect(selections).toEqual([]);
        expect(changes).toEqual([]);
      });
    });

    /**
     * A table under service, drawn with what it is doing on it
     * (GitHub issue #1093).
     */
    describe('live table status', () => {
      const occupied: FloorPlanItem = {
        ...table,
        seats: 4,
        enabled: true,
        status: 'occupied',
        statusLabel: 'Occupied',
        statusDuration: '22 min',
      };

      it('tints the table and draws the status silhouette on it', () => {
        setInputs({ items: [occupied] });

        const shape = fixture.nativeElement.querySelector(
          '[data-item-id="table-1"] circle',
        ) as SVGCircleElement;
        const status = query('floor-plan-status-table-1');

        expect(shape.style.fill).toContain('rgba');
        expect(status?.querySelector('path')?.getAttribute('d')).toBeTruthy();
      });

      /**
       * The word is not drawn on the table, because everything on this canvas
       * is a share of the `viewBox` and a status word at plan scale is about
       * eight pixels. It is in the `<title>`, where a hover and a screen reader
       * find it, in the accessible name, and in the summary bar beside the
       * plan - none of which are a hover away from each other.
       */
      it('names the status without drawing the word on the plan', () => {
        setInputs({ items: [occupied] });

        const status = query('floor-plan-status-table-1');

        expect(status?.querySelector('title')?.textContent).toContain(
          'Occupied',
        );
        expect(status?.querySelector('text')).toBeNull();
      });

      /**
       * The time in state takes the seat count's place: one small number under
       * a table is readable across a room and two are not, and a table already
       * holding a party is not one a host is sizing up.
       */
      it('draws the time in state instead of the capacity', () => {
        setInputs({ items: [occupied] });

        expect(query('floor-plan-duration-table-1')?.textContent).toContain(
          '22 min',
        );
        expect(query('floor-plan-seats-table-1')).toBeNull();
      });

      it('keeps the capacity on a table with no clock running', () => {
        setInputs({
          items: [
            { ...occupied, status: 'available', statusDuration: undefined },
          ],
        });

        expect(query('floor-plan-duration-table-1')).toBeNull();
        expect(query('floor-plan-seats-table-1')).not.toBeNull();
      });

      /**
       * The drawing says what the table is doing, so the accessible name has
       * to as well - otherwise a screen reader describes the editor's plan
       * while the sighted half of the room reads the live one.
       */
      it('names the table by what it is doing', () => {
        setInputs({ items: [occupied] });

        const name = fixture.nativeElement
          .querySelector('[data-item-id="table-1"]')
          ?.getAttribute('aria-label');

        expect(name).toContain('table-plan-item-table-timed');
        expect(name).toContain('Occupied');
        expect(name).toContain('22 min');
      });

      /** Nothing of the sort in the editor, which knows no statuses. */
      it('draws no status on a table that has none', () => {
        setInputs({ items: [table] });

        expect(query('floor-plan-status-table-1')).toBeNull();
        expect(
          fixture.nativeElement
            .querySelector('[data-item-id="table-1"]')
            ?.getAttribute('aria-label'),
        ).toContain('floor-plan-item-table');
      });
    });
  });
});
