import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  AlertController,
  AlertOptions,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FLOOR_PLAN_PALETTE,
  FloorPlanCanvasComponent,
  FloorPlanItem,
  FloorPlanPlacement,
} from 'bite-tribe-business/floor-plan-ui';
import { FloorPlanSize, RestaurantTable, Room, TableShape } from 'model';
import { RoomDraft } from '../../integration/room-draft';
import {
  DEFAULT_ROOM_HEIGHT_MM,
  DEFAULT_ROOM_WIDTH_MM,
  FloorPlanComponent,
} from '../floor-plan.component';

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
  version: 1,
  ...over,
});

/**
 * The confirmation alert, captured rather than rendered: Ionic's overlay never
 * enters the fixture's DOM, so the options object is what there is to assert
 * on, and pressing a button means calling the handler it carries.
 */
interface AlertButton {
  text?: string;
  role?: string;
  handler?: () => void;
}

describe(FloorPlanComponent.name, () => {
  let component: FloorPlanComponent;
  let fixture: ComponentFixture<FloorPlanComponent>;
  let ref: ComponentRef<FloorPlanComponent>;
  let alerts: AlertOptions[];

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  /**
   * An Ionic button's own `disabled` input.
   *
   * Read off the component rather than off the attribute: `ion-button` is not
   * upgraded in jsdom, so the attribute it was first rendered with stays on the
   * element after the binding turns it off again.
   */
  const buttonDisabled = (testId: string): boolean =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))
      .componentInstance.disabled;

  const pressAlertButton = (role: string): void => {
    const buttons = (alerts[alerts.length - 1].buttons ?? []) as AlertButton[];

    buttons.find((button) => button.role === role)?.handler?.();
  };

  beforeEach(async () => {
    alerts = [];

    await TestBed.configureTestingModule({
      imports: [FloorPlanComponent],
      providers: [
        provideIonicAngular(),
        {
          provide: AlertController,
          useValue: {
            create: (
              options: AlertOptions,
            ): Promise<{
              present: () => Promise<void>;
            }> => {
              alerts.push(options);

              return Promise.resolve({
                present: (): Promise<void> => Promise.resolve(),
              });
            },
          },
        },
        {
          provide: TranslocoService,
          useValue: {
            translate: (
              key: string,
              params?: Record<string, unknown>,
            ): string => (params ? `${key}:${JSON.stringify(params)}` : key),
          },
        },
      ],
    })
      .overrideComponent(FloorPlanComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      // The canvas is a child component with a catalogue of its own, and the
      // real pipe would want a real `TranslocoService` behind the stub above.
      .overrideComponent(FloorPlanCanvasComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FloorPlanComponent);
    ref = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('when the restaurant has no rooms', () => {
    it('invites the owner to make the first one', () => {
      expect(query('floor-plan-empty')).not.toBeNull();
      expect(query('floor-plan-create-first-room')).not.toBeNull();
      expect(query('floor-plan-room-list')).toBeNull();
    });

    it('creates it at the default size, under a name that can be picked out', () => {
      const drafts: RoomDraft[] = [];
      component.createRoom.subscribe((draft) => drafts.push(draft));

      component.onAddRoom();

      expect(drafts).toEqual([
        {
          name: 'floor-plan-room-default-name:{"number":1}',
          width: DEFAULT_ROOM_WIDTH_MM,
          height: DEFAULT_ROOM_HEIGHT_MM,
        },
      ]);
    });
  });

  describe('with no room open', () => {
    it('has nothing to delete, and asks about nothing', async () => {
      await component.onDelete();

      expect(alerts).toEqual([]);
    });

    it('describes no stored size', () => {
      expect(component.storedSize()).toBe('');
    });
  });

  /**
   * A failed read resolves to an empty list through `resourceValue`, so a page
   * that took that at face value would tell the owner their restaurant has no
   * rooms — the trap of issue #1232, in a surface where the plan the owner
   * built is what is missing.
   */
  it('says the read failed rather than claiming there are no rooms', () => {
    setInputs({ loadFailed: true });

    expect(query('floor-plan-failed')).not.toBeNull();
    expect(query('floor-plan-empty')).toBeNull();
    expect(query('floor-plan-create-first-room')).toBeNull();
  });

  it('claims neither state while the read is still running', () => {
    setInputs({ loading: true });

    expect(query('floor-plan-empty')).toBeNull();
    expect(query('floor-plan-failed')).toBeNull();
  });

  describe('with a room open', () => {
    beforeEach(() =>
      setInputs({ rooms: [room()], selectedRoom: room(), gridSpacing: 500 }),
    );

    it('shows the room and its canvas', () => {
      expect(query('floor-plan-room-list')).not.toBeNull();
      expect(query('floor-plan-canvas')).not.toBeNull();
      expect(query('floor-plan-empty')).toBeNull();
    });

    it('fills the form with the stored dimensions in metres', () => {
      expect(component.name()).toBe('Main dining room');
      expect(component.width()).toBe('8');
      expect(component.height()).toBe('12');
      expect(component.storedSize()).toBe('8 m × 12 m');
    });

    /** Metres in the form, millimetres in the draft, and nowhere else. */
    it('emits a save in millimetres', () => {
      const drafts: RoomDraft[] = [];
      component.saveRoom.subscribe((draft) => drafts.push(draft));

      component.name.set('  Terrace  ');
      component.width.set('6.5');
      component.height.set('9');
      component.onSave();

      expect(drafts).toEqual([{ name: 'Terrace', width: 6500, height: 9000 }]);
    });

    it('refuses to save a nameless room', () => {
      const drafts: RoomDraft[] = [];
      component.saveRoom.subscribe((draft) => drafts.push(draft));

      component.name.set('   ');
      component.onSave();

      expect(component.canSave()).toBe(false);
      expect(drafts).toEqual([]);
    });

    it.each([
      ['zero', '0'],
      ['a slipped decimal point', '8000'],
      ['nothing at all', ''],
      ['a word', 'wide'],
    ])('refuses a width that is %s', (_case, width) => {
      component.width.set(width);

      expect(component.canSave()).toBe(false);
    });

    it('locks the form while a write is in flight', () => {
      setInputs({ saving: true });

      expect(component.canSave()).toBe(false);
    });

    it('follows the room the owner switches to', () => {
      const terrace = room({
        id: 'room-2',
        name: 'Terrace',
        size: { width: 4000, height: 4000 },
      });

      setInputs({ rooms: [room(), terrace], selectedRoom: terrace });

      expect(component.name()).toBe('Terrace');
      expect(component.width()).toBe('4');
    });

    /**
     * The lost-race case, seen from the form.
     *
     * A save refused by the version rule replaces the open room with the room
     * *as stored*. The form has to follow it: leaving the owner's rejected text
     * in the field while the canvas and the toast say something else is the one
     * outcome the conflict handling exists to avoid.
     */
    it('shows the stored room when the version moves under it', () => {
      component.name.set('Mine, and too late');

      setInputs({
        selectedRoom: room({ name: 'Renamed elsewhere', version: 3 }),
      });

      expect(component.name()).toBe('Renamed elsewhere');
    });

    /** A new `Room` object for the same room at the same version is not news. */
    it('keeps what the owner typed when the room is re-emitted unchanged', () => {
      component.name.set('Half typed');

      setInputs({ selectedRoom: room() });

      expect(component.name()).toBe('Half typed');
    });

    it('emits the room the owner picked', () => {
      const picked: string[] = [];
      component.selectRoom.subscribe((id) => picked.push(id));

      component.onSelectRoom('room-2');
      component.onSelectRoom(undefined);

      expect(picked).toEqual(['room-2']);
    });

    it('numbers a new room after the ones already there', () => {
      const drafts: RoomDraft[] = [];
      component.createRoom.subscribe((draft) => drafts.push(draft));

      setInputs({ rooms: [room(), room({ id: 'room-2' })] });
      component.onAddRoom();

      expect(drafts[0].name).toBe('floor-plan-room-default-name:{"number":3}');
    });

    describe('deleting the room', () => {
      it('confirms first, and names the room in the confirmation', async () => {
        const deleted: Room[] = [];
        component.deleteRoom.subscribe((value) => deleted.push(value));

        await component.onDelete();

        expect(alerts).toHaveLength(1);
        expect(alerts[0].subHeader).toBe('Main dining room');
        expect(deleted).toEqual([]);
      });

      it('deletes once the owner confirms', async () => {
        const deleted: Room[] = [];
        component.deleteRoom.subscribe((value) => deleted.push(value));

        await component.onDelete();
        pressAlertButton('destructive');

        expect(deleted).toEqual([room()]);
      });

      it('deletes nothing when the owner cancels', async () => {
        const deleted: Room[] = [];
        component.deleteRoom.subscribe((value) => deleted.push(value));

        await component.onDelete();
        pressAlertButton('cancel');

        expect(deleted).toEqual([]);
      });
    });

    describe('the grid', () => {
      it('reports a new spacing, and ignores a cleared select', () => {
        const spacings: number[] = [];
        component.gridSpacingChange.subscribe((value) => spacings.push(value));

        component.onGridSpacingChange(1000);
        component.onGridSpacingChange(undefined);

        expect(spacings).toEqual([1000]);
      });

      it('labels each spacing in metres', () => {
        expect(component.spacingLabel(500)).toBe('0.5 m');
        expect(component.spacingLabel(1000)).toBe('1 m');
      });

      it('lists every room and marks the open one', () => {
        setInputs({ rooms: [room(), room({ id: 'room-2', name: 'Terrace' })] });

        const list = query('floor-plan-room-list');

        expect(list?.children).toHaveLength(2);
        expect(
          query('floor-plan-room-room-1')?.getAttribute('aria-current'),
        ).toBe('true');
        expect(
          query('floor-plan-room-room-2')?.getAttribute('aria-current'),
        ).toBeNull();
      });

      it('opens the room that was pressed', () => {
        setInputs({ rooms: [room(), room({ id: 'room-2', name: 'Terrace' })] });

        const picked: string[] = [];
        component.selectRoom.subscribe((id) => picked.push(id));

        query('floor-plan-room-room-2')?.click();

        expect(picked).toEqual(['room-2']);
      });

      it('reports the snap toggle', () => {
        const toggles: boolean[] = [];
        component.snapChange.subscribe((value) => toggles.push(value));

        component.onSnapChange(false);

        expect(toggles).toEqual([false]);
      });
    });

    /**
     * Where each card lives (GitHub issue #1085).
     *
     * Asserted as containment rather than as pixels, because the columns are
     * CSS grid and jsdom lays out nothing. What these protect is the rule the
     * layout encodes: the left column describes the restaurant, the right
     * column acts on a selection, and the grid settings are anchored so they
     * do not move as the selection changes.
     */
    describe('the arrangement of the cards', () => {
      const chair: FloorPlanItem = {
        id: 'chair-1',
        kind: 'object',
        variant: 'chair',
        position: { x: 1000, y: 1000 },
        size: { width: 450, height: 450 },
        rotation: 0,
        round: false,
      };

      const seatedTable: RestaurantTable = {
        id: 'table-1',
        label: '7',
        roomId: 'room-1',
        shape: 'rectangle',
        size: { width: 1200, height: 800 },
        position: { x: 2000, y: 2000 },
        rotation: 0,
        seats: 4,
        enabled: true,
      };

      const row = (): HTMLElement =>
        fixture.nativeElement.querySelector('.floor-plan__row');

      it('keeps the table beside the room it belongs to, in the left column', () => {
        setInputs({ selectedTable: seatedTable });

        const side = fixture.nativeElement.querySelector('.floor-plan__side');

        expect(query('floor-plan-table-properties')).not.toBeNull();
        expect(side.contains(query('floor-plan-table-properties'))).toBe(true);
      });

      it('puts the object panel and the grid in one row under the canvas', () => {
        setInputs({ items: [chair], selectedIds: ['chair-1'] });

        expect(row().contains(query('floor-plan-object-width'))).toBe(true);
        expect(row().contains(query('floor-plan-grid-spacing'))).toBe(true);
      });

      it('leaves the grid in the row when nothing is selected', () => {
        setInputs({ items: [chair], selectedIds: [] });

        expect(query('floor-plan-object-width')).toBeNull();
        expect(row().contains(query('floor-plan-grid-spacing'))).toBe(true);
      });

      /** The numbering helper takes the object panel's slot, not a new one. */
      it('puts the numbering helper in the same slot for a multi-selection', () => {
        setInputs({
          items: [chair],
          selectedIds: ['chair-1', 'table-1'],
          selectedTableCount: 2,
        });

        expect(query('floor-plan-object-width')).toBeNull();
        expect(row().contains(query('floor-plan-numbering-start'))).toBe(true);
        expect(row().contains(query('floor-plan-grid-spacing'))).toBe(true);
      });
    });

    describe('several rooms and floors', () => {
      const terrace = room({ id: 'room-2', name: 'Terrace', order: 1 });
      const gallery = room({ id: 'room-3', name: 'Gallery', order: 2 });

      const capacities = {
        'room-1': { tables: 3, seats: 12, disabled: 1 },
        'room-2': { tables: 2, seats: 8, disabled: 0 },
      };

      it('shows what each room holds, and the restaurant across them', () => {
        setInputs({
          rooms: [room(), terrace],
          roomCapacities: capacities,
          restaurantCapacity: {
            rooms: 2,
            tables: 5,
            seats: 20,
            disabled: 1,
          },
        });

        expect(query('floor-plan-room-summary-room-1')?.textContent).toContain(
          'floor-plan-room-summary',
        );
        expect(query('floor-plan-room-summary-room-1')?.textContent).toContain(
          'floor-plan-capacity-disabled',
        );
        expect(
          query('floor-plan-room-summary-room-2')?.textContent,
        ).not.toContain('floor-plan-capacity-disabled');
        expect(query('floor-plan-restaurant-summary')).not.toBeNull();
      });

      /**
       * A restaurant on one floor gets no headings.
       *
       * A single heading saying the rooms are on no floor is a grouping that
       * groups nothing, and it costs a line above every room list in the
       * product.
       */
      it('heads the list by level only once a room names one', () => {
        setInputs({ rooms: [room(), terrace] });

        expect(query('floor-plan-floor-none')).toBeNull();

        setInputs({
          rooms: [room({ floor: 'Ground floor' }), terrace],
        });

        expect(query('floor-plan-floor-Ground floor')?.textContent).toContain(
          'Ground floor',
        );
        expect(query('floor-plan-floor-none')?.textContent).toContain(
          'floor-plan-floor-unassigned',
        );
      });

      it('reports the level the owner typed, and no level once it is cleared', () => {
        const drafts: RoomDraft[] = [];
        component.saveRoom.subscribe((draft) => drafts.push(draft));

        component.floor.set('  Upstairs  ');
        component.onSave();

        component.floor.set('   ');
        component.onSave();

        expect(drafts[0].floor).toBe('Upstairs');
        expect(drafts[1].floor).toBeUndefined();
      });

      it('fills the floor field from the room that is open', () => {
        setInputs({
          rooms: [room(), terrace],
          selectedRoom: room({ id: 'room-2', floor: 'Upstairs', version: 2 }),
        });

        expect(component.floor()).toBe('Upstairs');
      });

      describe('reordering', () => {
        const moves: { roomId: string; offset: number }[] = [];

        beforeEach(() => {
          moves.length = 0;
          component.moveRoom.subscribe((move) => moves.push(move));
          setInputs({ rooms: [room(), terrace, gallery] });
        });

        it('moves a room one place up or down', () => {
          query('floor-plan-room-down-room-1')?.click();
          query('floor-plan-room-up-room-3')?.click();

          expect(moves).toEqual([
            { roomId: 'room-1', offset: 1 },
            { roomId: 'room-3', offset: -1 },
          ]);
        });

        /**
         * The reorder control sits inside the row that opens the room, so its
         * click must not also switch rooms - an owner tidying the list would
         * otherwise lose the room they were editing.
         */
        it('does not open the room it is reordering', () => {
          const picked: string[] = [];
          component.selectRoom.subscribe((id) => picked.push(id));

          query('floor-plan-room-down-room-2')?.click();

          expect(picked).toEqual([]);
        });

        it('closes the ends of the list', () => {
          expect(buttonDisabled('floor-plan-room-up-room-1')).toBe(true);
          expect(buttonDisabled('floor-plan-room-down-room-1')).toBe(false);
          expect(buttonDisabled('floor-plan-room-down-room-3')).toBe(true);
        });

        /**
         * Reordering writes rooms, and a room whose version moves reseeds the
         * editor. Closing the control while there is something to lose is the
         * honest answer, and the note beside the list says why.
         */
        it('waits for an unsaved room to be written, and says so', () => {
          setInputs({ unsavedChanges: true });

          expect(buttonDisabled('floor-plan-room-down-room-1')).toBe(true);
          expect(query('floor-plan-reorder-blocked')).not.toBeNull();
        });

        it('offers no reordering for a restaurant with one room', () => {
          setInputs({ rooms: [room()] });

          expect(query('floor-plan-room-down-room-1')).toBeNull();
        });
      });

      describe('switching rooms with unsaved changes', () => {
        beforeEach(() => {
          setInputs({ rooms: [room(), terrace], unsavedChanges: true });
        });

        /** The acceptance criterion: no unsaved change is lost silently. */
        it('asks before leaving, and leaves once the owner agrees', async () => {
          const picked: string[] = [];
          component.selectRoom.subscribe((id) => picked.push(id));

          query('floor-plan-room-room-2')?.click();
          await fixture.whenStable();

          expect(picked).toEqual([]);
          expect(alerts).toHaveLength(1);

          pressAlertButton('destructive');

          expect(picked).toEqual(['room-2']);
        });

        it('stays where it is when the owner cancels', async () => {
          const picked: string[] = [];
          component.selectRoom.subscribe((id) => picked.push(id));

          query('floor-plan-room-room-2')?.click();
          await fixture.whenStable();
          pressAlertButton('cancel');

          expect(picked).toEqual([]);
        });

        it('asks nothing when the room is already open', async () => {
          component.onSelectRoom('room-1');
          await fixture.whenStable();

          expect(alerts).toHaveLength(0);
        });

        it('asks nothing when there is nothing to lose', async () => {
          setInputs({ unsavedChanges: false });
          const picked: string[] = [];
          component.selectRoom.subscribe((id) => picked.push(id));

          query('floor-plan-room-room-2')?.click();
          await fixture.whenStable();

          expect(alerts).toHaveLength(0);
          expect(picked).toEqual(['room-2']);
        });
      });
    });

    describe('the object palette', () => {
      let placements: FloorPlanPlacement[];

      beforeEach(() => {
        placements = [];
        component.placeRequest.subscribe((place) => placements.push(place));
      });

      it('offers every entry of the palette', () => {
        expect(query('floor-plan-palette')?.children).toHaveLength(
          FLOOR_PLAN_PALETTE.length,
        );
        expect(query('floor-plan-place-table-round')).not.toBeNull();
        expect(query('floor-plan-place-wall')).not.toBeNull();
      });

      /**
       * One viewBox across the whole palette, so a 450 mm chair is drawn as a
       * fraction of a 3 m bar rather than at the same width as it.
       */
      it('draws every entry against the same extent', () => {
        const bar = component
          .palette()
          .find((entry) => entry.variant === 'bar');
        const chair = component
          .palette()
          .find((entry) => entry.variant === 'chair');

        expect(bar?.width).toBe(3000);
        expect(chair?.width).toBe(450);
        expect(component.paletteExtent).toBe(3000);
      });

      it('names each entry in metres', () => {
        const table = component
          .palette()
          .find((entry) => entry.variant === 'table-rectangle');

        expect(table?.caption).toBe('1.2 m × 0.8 m');
      });

      /**
       * The keyboard path. Dragging needs a pointer, and every mutation has to
       * be reachable without one.
       */
      it('places an entry in the middle of the view when it is activated', () => {
        query('floor-plan-place-chair')?.click();

        expect(placements).toEqual([
          { variant: 'chair', position: { x: 4000, y: 6000 } },
        ]);
      });

      it('places nothing while no room is open', () => {
        setInputs({ selectedRoom: undefined });

        component.onPaletteActivate('chair');

        expect(placements).toEqual([]);
      });

      it('hands the dragged entry to the drop target', () => {
        const data: Record<string, string> = {};
        const event = {
          dataTransfer: {
            setData: (type: string, value: string): void => {
              data[type] = value;
            },
            effectAllowed: '',
          },
        } as unknown as DragEvent;

        component.onPaletteDragStart(event, 'wall');

        expect(data['text/plain']).toBe('wall');
      });
    });

    describe('the selected object', () => {
      const chair: FloorPlanItem = {
        id: 'chair-1',
        kind: 'object',
        variant: 'chair',
        position: { x: 1000, y: 1000 },
        size: { width: 450, height: 450 },
        rotation: 30,
        round: false,
      };

      const roundTable: FloorPlanItem = {
        id: 'table-1',
        kind: 'table',
        variant: 'table-round',
        position: { x: 2000, y: 2000 },
        size: { width: 900, height: 900 },
        rotation: 0,
        label: '7',
        round: true,
      };

      beforeEach(() =>
        setInputs({ items: [chair, roundTable], selectedIds: ['chair-1'] }),
      );

      it('shows the panel for one selected object and hides it for two', () => {
        expect(query('floor-plan-object-width')).not.toBeNull();

        setInputs({ selectedIds: ['chair-1', 'table-1'] });
        expect(query('floor-plan-object-width')).toBeNull();

        setInputs({ selectedIds: [] });
        expect(query('floor-plan-object-width')).toBeNull();
      });

      it('fills the inputs from the object in metres and degrees', () => {
        expect(component.itemWidth()).toBe('0.45');
        expect(component.itemHeight()).toBe('0.45');
        expect(component.itemRotation()).toBe('30');
      });

      /** The fields are a readout of a shape the owner may be dragging. */
      it('follows the object as a gesture moves it', () => {
        setInputs({
          items: [
            { ...chair, rotation: 90, size: { width: 900, height: 450 } },
          ],
        });

        expect(component.itemWidth()).toBe('0.9');
        expect(component.itemRotation()).toBe('90');
      });

      it('offers one measurement for a round table and two for a rectangle', () => {
        setInputs({ selectedIds: ['table-1'] });

        expect(query('floor-plan-object-width')).not.toBeNull();
        expect(query('floor-plan-object-height')).toBeNull();
      });

      it('reports a resize in millimetres', () => {
        const sizes: FloorPlanSize[] = [];
        component.resizeSelected.subscribe((size) => sizes.push(size));

        component.itemWidth.set('1.2');
        component.itemHeight.set('0.7');
        component.onItemSizeChange();

        expect(sizes).toEqual([{ width: 1200, height: 700 }]);
      });

      it('keeps a round table circular from one input', () => {
        setInputs({ selectedIds: ['table-1'] });
        const sizes: FloorPlanSize[] = [];
        component.resizeSelected.subscribe((size) => sizes.push(size));

        component.itemWidth.set('1.4');
        component.onItemSizeChange();

        expect(sizes).toEqual([{ width: 1400, height: 1400 }]);
      });

      it('reports a rotation in degrees', () => {
        const degrees: number[] = [];
        component.rotateSelected.subscribe((value) => degrees.push(value));

        component.itemRotation.set('45');
        component.onItemRotationChange();

        expect(degrees).toEqual([45]);
      });

      it.each([['abc'], ['']])('reports nothing for %p', (typed) => {
        const sizes: FloorPlanSize[] = [];
        const degrees: number[] = [];
        component.resizeSelected.subscribe((size) => sizes.push(size));
        component.rotateSelected.subscribe((value) => degrees.push(value));

        component.itemWidth.set(typed);
        component.itemRotation.set(typed);
        component.onItemSizeChange();
        component.onItemRotationChange();

        expect(sizes).toEqual([]);
        expect(degrees).toEqual([]);
      });
    });

    describe('the selected table', () => {
      const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
        ({
          id: 'table-1',
          label: '7',
          roomId: 'room-1',
          shape: 'rectangle',
          size: { width: 1200, height: 800 },
          position: { x: 2000, y: 2000 },
          rotation: 0,
          seats: 4,
          enabled: true,
          ...over,
        }) as RestaurantTable;

      beforeEach(() => setInputs({ selectedTable: table() }));

      it('opens the table card only when one table is selected', () => {
        expect(query('floor-plan-table-properties')).not.toBeNull();

        setInputs({ selectedTable: undefined });
        expect(query('floor-plan-table-properties')).toBeNull();
      });

      it('fills the fields from the table', () => {
        expect(component.tableLabel()).toBe('7');
        expect(component.tableSeats()).toBe('4');
      });

      describe('moving it to another room', () => {
        it('offers the choice only once there is another room', () => {
          expect(query('floor-plan-table-room')).toBeNull();

          setInputs({ rooms: [room(), room({ id: 'room-2' })] });

          expect(query('floor-plan-table-room')).not.toBeNull();
        });

        it('reports the room the owner picked', () => {
          const picked: string[] = [];
          component.moveTable.subscribe((roomId) => picked.push(roomId));

          component.onMoveTable('room-2');
          component.onMoveTable('room-1');
          component.onMoveTable(undefined);

          expect(picked).toEqual(['room-2']);
        });
      });

      it('reports the typed label, and lets the editor rule on it', () => {
        const labels: string[] = [];
        component.renameTable.subscribe((label) => labels.push(label));

        component.tableLabel.set('12');
        component.onLabelChange();

        expect(labels).toEqual(['12']);
      });

      it('reports a capacity as a number', () => {
        const seats: number[] = [];
        component.tableSeatsChange.subscribe((value) => seats.push(value));

        component.tableSeats.set('6');
        component.onSeatsChange();

        expect(seats).toEqual([6]);
      });

      it('reports nothing for a capacity field that is being cleared', () => {
        const seats: number[] = [];
        component.tableSeatsChange.subscribe((value) => seats.push(value));

        component.tableSeats.set('');
        component.onSeatsChange();

        expect(seats).toEqual([]);
      });

      it.each([['round'], ['rectangle']])('reports the %p shape', (shape) => {
        const shapes: TableShape[] = [];
        component.tableShapeChange.subscribe((value) => shapes.push(value));

        component.onShapeChange(shape);

        expect(shapes).toEqual([shape]);
      });

      it('reports nothing for a segment value that is not a shape', () => {
        const shapes: TableShape[] = [];
        component.tableShapeChange.subscribe((value) => shapes.push(value));

        component.onShapeChange(undefined);

        expect(shapes).toEqual([]);
      });

      it('reports the service state', () => {
        const states: boolean[] = [];
        component.tableEnabledChange.subscribe((value) => states.push(value));

        component.onEnabledChange(false);

        expect(states).toEqual([false]);
      });

      it('says a disabled table stays on the plan', () => {
        expect(query('floor-plan-table-disabled-hint')).toBeNull();

        setInputs({ selectedTable: table({ enabled: false }) });

        expect(query('floor-plan-table-disabled-hint')).not.toBeNull();
      });

      /**
       * The refused label is the one thing the fields do not refill from: the
       * table kept its old label, and overwriting the owner's text would hide
       * exactly what the message is about.
       */
      it('names the room already holding a refused label', () => {
        setInputs({
          labelConflict: { issue: 'duplicate', label: '7' },
          labelConflictRoom: 'Terrace',
        });

        expect(query('floor-plan-table-label-conflict')?.textContent).toContain(
          'floor-plan-table-label-taken',
        );
      });

      it('says an empty label is not a table number', () => {
        setInputs({ labelConflict: { issue: 'empty', label: '' } });

        expect(query('floor-plan-table-label-conflict')?.textContent).toContain(
          'floor-plan-table-label-empty',
        );
      });

      it('shows no conflict message while nothing was refused', () => {
        expect(query('floor-plan-table-label-conflict')).toBeNull();
      });
    });

    describe('numbering several tables', () => {
      it('offers the helper only for more than one table', () => {
        setInputs({ selectedTableCount: 1 });
        expect(query('floor-plan-numbering')).toBeNull();

        setInputs({ selectedTableCount: 3 });
        expect(query('floor-plan-numbering')).not.toBeNull();
      });

      it('reports the start number the owner typed', () => {
        setInputs({ selectedTableCount: 3 });
        const starts: number[] = [];
        component.numberTables.subscribe((start) => starts.push(start));

        component.numberFrom.set('20');
        component.onNumberTables();

        expect(starts).toEqual([20]);
      });

      it('falls back to one when the start field is empty', () => {
        setInputs({ selectedTableCount: 3 });
        const starts: number[] = [];
        component.numberTables.subscribe((start) => starts.push(start));

        component.numberFrom.set('');
        component.onNumberTables();

        expect(starts).toEqual([1]);
      });
    });

    describe('the editor toolbar', () => {
      let commands: string[];

      beforeEach(() => {
        commands = [];
        component.commandRequest.subscribe((name) => commands.push(name));
      });

      it('offers undo and redo only when there is something to undo', () => {
        expect(buttonDisabled('floor-plan-undo')).toBe(true);
        expect(buttonDisabled('floor-plan-redo')).toBe(true);

        setInputs({ canUndo: true, canRedo: true });

        expect(buttonDisabled('floor-plan-undo')).toBe(false);
        expect(buttonDisabled('floor-plan-redo')).toBe(false);
      });

      it('offers duplicate and delete only for a selection', () => {
        expect(buttonDisabled('floor-plan-duplicate')).toBe(true);
        expect(buttonDisabled('floor-plan-delete-selection')).toBe(true);

        setInputs({ selectedIds: ['chair-1'] });

        expect(buttonDisabled('floor-plan-duplicate')).toBe(false);
        expect(buttonDisabled('floor-plan-delete-selection')).toBe(false);
      });

      it.each([
        ['floor-plan-undo', 'undo', { canUndo: true }],
        ['floor-plan-redo', 'redo', { canRedo: true }],
        ['floor-plan-duplicate', 'duplicate', { selectedIds: ['chair-1'] }],
        ['floor-plan-delete-selection', 'delete', { selectedIds: ['chair-1'] }],
      ])('asks the editor for %p on a press', (testId, expected, inputs) => {
        setInputs(inputs);

        query(testId)?.click();

        expect(commands).toEqual([expected]);
      });

      it('says nothing about unsaved changes until there are some', () => {
        expect(query('floor-plan-unsaved')).toBeNull();

        setInputs({ unsavedChanges: true });

        expect(query('floor-plan-unsaved')).not.toBeNull();
      });
    });
  });
});
