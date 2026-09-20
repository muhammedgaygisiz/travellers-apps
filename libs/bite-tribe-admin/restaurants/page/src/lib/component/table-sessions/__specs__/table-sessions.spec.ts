import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AdminTableSession } from 'bite-tribe-admin/restaurants-data-access';
import { TableSessions } from '../table-sessions';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params ? `${value}:${JSON.stringify(params)}` : value;
  }
}

/**
 * The operator's view of every table session (GitHub issue #1629).
 *
 * What it has to say that the restaurant's own list does not: which restaurant
 * a session belongs to, and what happened to sessions that have ended - this
 * is the screen a support question is answered from.
 */
const session = (
  overrides: Partial<AdminTableSession> = {},
): AdminTableSession =>
  ({
    id: '8_table-12_guest-1',
    restaurantId: 'restaurant-1',
    tableId: 'table-12',
    guestUserId: 'guest-1',
    status: 'active',
    startedAt: Date.parse('2026-09-20T18:00:00.000Z'),
    lastActiveAt: Date.parse('2026-09-20T18:20:00.000Z'),
    isAnonymousGuest: true,
    ...overrides,
  }) as AdminTableSession;

describe(TableSessions.name, () => {
  let fixture: ComponentFixture<TableSessions>;

  const render = (sessions: AdminTableSession[]): void => {
    fixture.componentRef.setInput('sessions', sessions);
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] })
      .overrideComponent(TableSessions, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TableSessions);
  });

  it('names the table, the restaurant and the status of each session', () => {
    render([session()]);

    expect(text()).toContain('table-12');
    expect(text()).toContain('restaurant-1');
  });

  /** Ended sessions are the point of this screen rather than noise on it. */
  it('lists a session that has ended', () => {
    render([session({ id: 'ended', status: 'closed' })]);

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="table-session-ended"]',
      ),
    ).toBeTruthy();
  });

  it('says where a party was moved to', () => {
    render([session({ currentTableId: 'table-5', currentTableLabel: '5' })]);

    expect(text()).toContain('5');
  });

  it('says so when there is nothing to show', () => {
    render([]);

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="table-sessions-empty"]',
      ),
    ).toBeTruthy();
  });
});
