import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { RestaurantTable, TableStatus } from 'model';
import {
  TableAction,
  TableActionRequest,
  tableActions,
} from '../../integration/table-actions';
import { TableDetail } from '../../integration/table-plan.service';
import { TableActionsComponent } from '../table-actions.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params === undefined ? value : `${value} ${JSON.stringify(params)}`;
  }
}

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

const detail = (status: TableStatus): TableDetail => ({
  table,
  status,
  statusLabel: `table-status-${status}`,
  duration: '22 min',
});

/**
 * The sheet a staff member acts from (GitHub issue #1094).
 *
 * It holds no rules about which transitions exist - that is the matrix, and
 * `tableActions` derives the buttons from it. What is asserted here is what
 * the sheet owns: the guest count, the keyboard, and that picking a button
 * says exactly what was picked.
 */
describe(TableActionsComponent.name, () => {
  let component: TableActionsComponent;
  let fixture: ComponentFixture<TableActionsComponent>;
  let ref: ComponentRef<TableActionsComponent>;
  let picked: TableActionRequest[];
  let dismissed: number;

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const click = (testId: string): void => {
    (query(testId) as HTMLElement).click();
    fixture.detectChanges();
  };

  const open = (status: TableStatus, actions?: TableAction[]): void => {
    ref.setInput('table', detail(status));
    ref.setInput('actions', actions ?? tableActions(status));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableActionsComponent],
      providers: [provideIonicAngular()],
    })
      .overrideComponent(TableActionsComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TableActionsComponent);
    ref = fixture.componentRef;
    component = fixture.componentInstance;
    picked = [];
    dismissed = 0;
    component.actionPicked.subscribe((request) => picked.push(request));
    component.dismissed.subscribe(() => (dismissed += 1));
  });

  it('names the table and says what it is doing now', () => {
    open('occupied');

    expect(query('table-actions')?.textContent).toContain(
      'table-actions-title',
    );
    expect(query('table-actions-status')?.textContent).toContain(
      'table-status-occupied',
    );
    expect(query('table-actions-status')?.textContent).toContain('22 min');
  });

  /**
   * The list is given to it, so what is asserted is that every entry becomes a
   * button and nothing else does.
   */
  it('draws one button per offered action', () => {
    open('available');

    tableActions('available').forEach((action) =>
      expect(query(`table-action-${action.to}`)).not.toBeNull(),
    );
    expect(query('table-action-awaitingPayment')).toBeNull();
  });

  it('reports the action that was pressed', () => {
    open('available');
    click('table-action-reserved');

    expect(picked).toEqual([{ to: 'reserved' }]);
  });

  describe('the guest count', () => {
    /** Only where a party can actually be seated. */
    it('is offered at a table that can be seated and nowhere else', () => {
      open('available');
      expect(query('table-actions-guests')).not.toBeNull();

      open('cleaning');
      expect(query('table-actions-guests')).toBeNull();
    });

    /**
     * The acceptance criterion about one interaction: a count nobody entered
     * must never stand between a host and a seated party.
     */
    it('seats a party with no count at all', () => {
      open('available');
      click('table-action-occupied');

      expect(picked).toEqual([{ to: 'occupied' }]);
    });

    it('carries the count that is showing', () => {
      open('available');
      click('table-actions-guests-more');
      click('table-actions-guests-more');
      click('table-action-occupied');

      expect(picked).toEqual([{ to: 'occupied', guests: 2 }]);
    });

    /** Below the smallest party there is no count, rather than a zero. */
    it('goes back to no count at all rather than to zero', () => {
      open('available');
      click('table-actions-guests-more');
      click('table-actions-guests-fewer');

      expect(query('table-actions-guests-count')?.textContent).toContain(
        'table-actions-guests-none',
      );

      click('table-actions-guests-fewer');
      click('table-action-occupied');

      expect(picked).toEqual([{ to: 'occupied' }]);
    });

    it('stops counting at a party no restaurant seats at one table', () => {
      open('available');

      for (let press = 0; press < 25; press += 1) {
        click('table-actions-guests-more');
      }

      expect(query('table-actions-guests-count')?.textContent).toContain('20');
    });

    /**
     * A count is about the party in front of the host, not about the sheet.
     * Turning to another table must not carry the last party's size with it.
     */
    it('forgets the count when the sheet turns to another table', () => {
      open('available');
      click('table-actions-guests-more');

      ref.setInput('table', {
        ...detail('available'),
        table: { ...table, id: 'table-2' },
      });
      fixture.detectChanges();

      expect(component.guests()).toBeUndefined();
    });

    /**
     * Marking a table cleaning with "4 guests" recorded against it would put a
     * party in the audit trail that never sat down.
     */
    it('never carries the count on an action that seats nobody', () => {
      open('available');
      click('table-actions-guests-more');
      click('table-action-cleaning');

      expect(picked).toEqual([{ to: 'cleaning' }]);
    });
  });

  describe('the keyboard', () => {
    const keydown = (key: string, shiftKey = false): void => {
      (query('table-actions') as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }),
      );
      fixture.detectChanges();
    };

    /**
     * A keyboard user who pressed enter on a table must not be left with focus
     * on the canvas behind an open dialog.
     */
    it('takes focus into the sheet as it opens', () => {
      open('available');

      expect(document.activeElement).toBe(query('table-actions-close'));
    });

    it('closes on escape', () => {
      open('available');
      keydown('Escape');

      expect(dismissed).toBe(1);
    });

    it('closes on the close button', () => {
      open('available');
      click('table-actions-close');

      expect(dismissed).toBe(1);
    });

    /**
     * A dialog that lets tab walk out of it is a dialog a keyboard user cannot
     * tell they are still in: the buttons behind it act on the plan
     * underneath, and nothing says the sheet is open.
     */
    it('keeps tab inside the sheet', () => {
      open('available');

      const buttons = Array.from(
        (query('table-actions') as HTMLElement).querySelectorAll('button'),
      );
      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      last.focus();
      keydown('Tab');
      expect(document.activeElement).toBe(first);

      keydown('Tab', true);
      expect(document.activeElement).toBe(last);
    });

    /** Tab in the middle of the sheet is the browser's business, not ours. */
    it('leaves tab alone away from the edges', () => {
      open('available');

      const buttons = Array.from(
        (query('table-actions') as HTMLElement).querySelectorAll('button'),
      );

      buttons[1].focus();
      keydown('Tab');

      expect(document.activeElement).toBe(buttons[1]);
    });
  });

  /** The scrim is how a pointer dismisses it, and is hidden from everyone else. */
  it('closes when the page behind it is tapped', () => {
    open('available');
    click('table-actions-scrim');

    expect(dismissed).toBe(1);
    expect(query('table-actions-scrim')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
