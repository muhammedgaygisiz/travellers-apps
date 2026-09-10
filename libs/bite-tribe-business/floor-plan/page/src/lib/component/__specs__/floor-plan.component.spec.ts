import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertController,
  AlertOptions,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FloorPlanCanvasComponent } from 'bite-tribe-business/floor-plan-ui';
import { Room } from 'model';
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
      expect(query('floor-plan-room-select')).toBeNull();
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
      expect(query('floor-plan-room-select')).not.toBeNull();
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

      it('reports the snap toggle', () => {
        const toggles: boolean[] = [];
        component.snapChange.subscribe((value) => toggles.push(value));

        component.onSnapChange(false);

        expect(toggles).toEqual([false]);
      });
    });
  });
});
