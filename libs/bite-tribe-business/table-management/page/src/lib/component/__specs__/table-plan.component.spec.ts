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
import { tableActions } from '../../integration/table-actions';
import { TableDetail } from '../../integration/table-plan.service';
import { TableStatusCount } from '../../integration/table-plan-summary';
import { TableActionsComponent } from '../table-actions.component';
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
      // The sheet is a child with a catalogue of its own too (issue #1094).
      .overrideComponent(TableActionsComponent, {
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
        liveStatus: 'live',
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

    /**
     * Four states rather than two (GitHub issue #1096), because "is this live"
     * has two different no answers and staff act differently on them.
     */
    it.each([
      ['live', 'table-plan-live'],
      ['connecting', 'table-plan-connecting'],
      ['offline', 'table-plan-offline'],
      ['stale', 'table-plan-stale'],
    ])('says the room is %s in its own words', (liveStatus, key) => {
      setInputs({ liveStatus });

      expect(query('table-plan-live')?.textContent).toContain(key);
    });

    /** Never colour alone: the icon changes shape as well as hue. */
    it('draws a different icon for every connection state', () => {
      const icons = new Set<string>();

      (['live', 'connecting', 'offline', 'stale'] as const).forEach(
        (liveStatus) => {
          setInputs({ liveStatus });
          // Read as a property: `ion-icon` declares `name` as one, so Angular
          // sets it there rather than leaving an attribute to read back.
          icons.add(
            (
              query('table-plan-live')?.querySelector(
                'ion-icon',
              ) as unknown as { name?: string }
            )?.name ?? '',
          );
        },
      );

      expect(icons.size).toBe(4);
    });

    /**
     * "Not current" without a number is a warning nobody can act on, and an
     * age beside a room that *is* current is noise.
     */
    it('names the age only once the room has gone stale', () => {
      setInputs({ liveStatus: 'offline', lastUpdated: '6 min' });

      expect(query('table-plan-stale')).toBeNull();

      setInputs({ liveStatus: 'stale' });

      expect(query('table-plan-stale')?.textContent).toContain(
        'table-plan-last-updated',
      );
    });

    /**
     * What is written down and not yet sent, kept apart from the connection:
     * one says whether the room is current, the other whether the host's own
     * changes have left the tablet (GitHub issue #1096).
     */
    it('says how many changes are waiting to be sent', () => {
      expect(query('table-plan-queued')).toBeNull();

      setInputs({ pendingCount: 3 });

      expect(query('table-plan-queued')?.textContent).toContain(
        'table-plan-queued',
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

      /**
       * The second way into the actions, for whoever tapped rather than held.
       * It asks for the same thing a long press does, so there is one path to
       * the sheet rather than two that can diverge.
       */
      it('opens the actions from the detail panel', () => {
        const activated: string[] = [];

        component.activateTable.subscribe((id) => activated.push(id));
        (query('table-plan-detail-actions') as HTMLElement).click();

        expect(activated).toEqual(['table-1']);
      });
    });

    /** The actions themselves (GitHub issue #1094). */
    describe('the action sheet', () => {
      it('is drawn only for the table it was opened on', () => {
        expect(query('table-actions')).toBeNull();

        setInputs({
          actionTarget: detail,
          actions: tableActions('occupied'),
        });

        expect(query('table-actions')).not.toBeNull();
        expect(query('table-action-available')).not.toBeNull();
        // Not in the matrix from `occupied`, so not on screen either.
        expect(query('table-action-reserved')).toBeNull();
      });

      it('passes the picked action on', () => {
        const picked: unknown[] = [];

        component.actionPicked.subscribe((request) => picked.push(request));
        setInputs({ actionTarget: detail, actions: tableActions('occupied') });
        (query('table-action-cleaning') as HTMLElement).click();

        expect(picked).toEqual([{ to: 'cleaning' }]);
      });

      /**
       * Closing hands focus back to the plan. The canvas is one tab stop
       * driven by `aria-activedescendant`, so a keyboard user who pressed
       * enter on a table and then escape would otherwise have nothing focused
       * at all.
       */
      it('returns focus to the plan when it closes', () => {
        let closed = 0;

        component.actionsDismissed.subscribe(() => (closed += 1));
        setInputs({ actionTarget: detail, actions: tableActions('occupied') });
        (query('table-actions-close') as HTMLElement).click();
        fixture.detectChanges();

        expect(closed).toBe(1);
        expect(document.activeElement).toBe(
          fixture.nativeElement.querySelector(
            '[data-testid="floor-plan-canvas"]',
          ),
        );
      });
    });

    /** The end-of-service reset (GitHub issue #1094). */
    describe('the batch', () => {
      it('offers one quiet button until staff ask for it', () => {
        let toggled = 0;

        component.bulkModeToggled.subscribe(() => (toggled += 1));

        expect(query('table-plan-batch')).toBeNull();
        (query('table-plan-batch-start') as HTMLElement).click();

        expect(toggled).toBe(1);
      });

      it('says how many are selected and offers the reset', () => {
        const asked: string[] = [];

        setInputs({ bulkMode: true, selectedCount: 8, freeableCount: 6 });
        component.freeSelected.subscribe(() => asked.push('free'));
        component.selectAllRequested.subscribe(() => asked.push('all'));

        expect(query('table-plan-batch')?.textContent).toContain('8');
        expect(query('table-plan-free-selected')?.textContent).toContain('6');

        (query('table-plan-select-all') as HTMLElement).click();
        (query('table-plan-free-selected') as HTMLElement).click();

        expect(asked).toEqual(['all', 'free']);
      });

      /**
       * A reset that would free nothing is not offered. Eight tables selected
       * and none of them freeable is a button that can only disappoint.
       */
      it('hides the reset when it would free nothing', () => {
        setInputs({ bulkMode: true, selectedCount: 2, freeableCount: 0 });

        expect(query('table-plan-free-selected')).toBeNull();
        expect(query('table-plan-batch-done')).not.toBeNull();
      });
    });
  });
});
