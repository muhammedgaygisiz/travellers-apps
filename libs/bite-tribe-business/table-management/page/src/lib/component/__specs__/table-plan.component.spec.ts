import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FloorPlanCanvasComponent,
  FloorPlanItem,
} from 'bite-tribe-business/floor-plan-ui';
import { RestaurantTable, Room } from 'model';
import { TableDetail } from '../../integration/table-plan.service';
import { TableStatusCount } from '../../integration/table-plan-summary';
import { TablePlanComponent } from '../table-plan.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params === undefined ? value : `${value} ${JSON.stringify(params)}`;
  }
}

const room = (id: string, name: string): Room => ({
  id,
  name,
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 1,
});

const table: RestaurantTable = {
  id: 'table-1',
  label: '6',
  roomId: 'room-1',
  position: { x: 1500, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
};

const item: FloorPlanItem = {
  id: 'table-1',
  kind: 'table',
  variant: 'table-round',
  position: { x: 1500, y: 3000 },
  size: { width: 900, height: 900 },
  rotation: 0,
  label: '6',
  round: true,
  seats: 4,
  enabled: true,
  status: 'occupied',
  statusLabel: 'Occupied',
  statusDuration: '22 min',
};

const summary: TableStatusCount[] = [
  { status: 'available', count: 5 },
  { status: 'occupied', count: 3 },
  { status: 'reserved', count: 0 },
  { status: 'cleaning', count: 1 },
];

const detail: TableDetail = {
  table,
  status: 'occupied',
  statusLabel: 'Occupied',
  duration: '22 min',
  note: 'Birthday cake at 21:00',
};

describe(TablePlanComponent.name, () => {
  let component: TablePlanComponent;
  let fixture: ComponentFixture<TablePlanComponent>;
  let ref: ComponentRef<TablePlanComponent>;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const query = (testId: string): Element | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablePlanComponent],
      providers: [provideIonicAngular(), provideRouter([])],
    })
      .overrideComponent(TablePlanComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      // The canvas is a child component with a catalogue of its own, and the
      // real pipe would want a real `TranslocoService` behind it.
      .overrideComponent(FloorPlanCanvasComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TablePlanComponent);
    ref = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows a spinner rather than an empty room while loading', () => {
    setInputs({ loading: true });

    expect(query('table-plan-summary')).toBeNull();
    expect(query('table-plan-empty')).toBeNull();
  });

  /**
   * A failed read resolves to an empty list, and a page that took that at face
   * value would tell staff their restaurant has no rooms in the middle of a
   * service.
   */
  it('separates a failed read from a restaurant with no rooms', () => {
    setInputs({ loadFailed: true });
    expect(query('table-plan-failed')).not.toBeNull();
    expect(query('table-plan-empty')).toBeNull();

    setInputs({ loadFailed: false, rooms: [] });
    expect(query('table-plan-empty')).not.toBeNull();
    expect(query('table-plan-failed')).toBeNull();
  });

  describe('with a room', () => {
    beforeEach(() =>
      setInputs({
        rooms: [room('room-1', 'Dining'), room('room-2', 'Terrace')],
        selectedRoom: room('room-1', 'Dining'),
        items: [item],
        roomTableCount: 1,
        summary,
        isLive: true,
      }),
    );

    it('counts every status of the room', () => {
      expect(query('table-plan-count-available')?.textContent).toContain('5');
      expect(query('table-plan-count-occupied')?.textContent).toContain('3');
      expect(query('table-plan-count-cleaning')?.textContent).toContain('1');
    });

    /**
     * Not a coloured dot. Only the glyph and the word survive greyscale and a
     * colour-vision deficiency, so the summary carries both wherever it names a
     * status - the same three channels the plan itself uses.
     */
    it('says each status by shape and word as well as by colour', () => {
      const chip = query('table-plan-count-occupied');

      expect(chip?.querySelector('path')?.getAttribute('d')).toBeTruthy();
      expect(chip?.textContent).toContain('table-status-occupied');
    });

    it('offers the rooms to switch between', () => {
      expect(query('table-plan-room-room-2')).not.toBeNull();
    });

    /** One room is not a choice, and a switcher for it is a row of chrome. */
    it('hides the switcher when there is only one room', () => {
      setInputs({ rooms: [room('room-1', 'Dining')] });

      expect(query('table-plan-rooms')).toBeNull();
    });

    it('asks for a room only when it is not the open one', () => {
      const asked: string[] = [];

      component.selectRoom.subscribe((id) => asked.push(id));

      component.onSelectRoom('room-1');
      component.onSelectRoom('room-2');
      component.onSelectRoom(undefined);

      expect(asked).toEqual(['room-2']);
    });

    it('says whether the room on screen is live', () => {
      expect(query('table-plan-live')?.textContent).toContain(
        'table-plan-live',
      );

      setInputs({ isLive: false });

      expect(query('table-plan-live')?.textContent).toContain(
        'table-plan-connecting',
      );
    });

    it('says a room with no tables is empty rather than showing nothing', () => {
      setInputs({ items: [], roomTableCount: 0 });

      expect(query('table-plan-room-empty')).not.toBeNull();
    });

    describe('the selected table', () => {
      beforeEach(() =>
        setInputs({ selectedIds: ['table-1'], selectedTable: detail }),
      );

      /**
       * The two things the plan has no room for: a sentence somebody left on
       * the table, and how long its clock has been running, spelled out rather
       * than drawn small.
       */
      it('shows the note and the time in state', () => {
        expect(query('table-plan-detail-note')?.textContent).toContain(
          'Birthday cake at 21:00',
        );
        expect(query('table-plan-detail-duration')?.textContent).toContain(
          '22 min',
        );
      });

      it('closes on request', () => {
        let closed = 0;

        component.clearSelection.subscribe(() => (closed += 1));
        (query('table-plan-detail-close') as HTMLElement).click();

        expect(closed).toBe(1);
      });

      it('shows nothing when no table is picked', () => {
        setInputs({ selectedIds: [], selectedTable: undefined });

        expect(query('table-plan-detail')).toBeNull();
        // The mark is the panel's own, so there is none to draw either. Read
        // directly, because the template never reaches it without a detail.
        expect(component.detailMark()).toBeUndefined();
      });
    });
  });
});
