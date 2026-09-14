import type { RestaurantTable, ScanAnomaly, TableSession } from 'model';
import {
  PENDING_SESSION_URGENT_AFTER_MS,
  SCAN_ANOMALY_ACTIVE_WITHIN_MS,
  pendingSessionRows,
  scanAnomalyRows,
} from '../scan-signal-rows';

/**
 * The two lists issue #1107 adds to the staff screens.
 *
 * Pure functions over documents, so every rule they live by is assertable
 * without rendering anything - which is the reason they are pure, and the same
 * reason `assistance-rows.spec.ts` beside this one exists.
 */

const NOW = Date.parse('2026-09-16T19:30:00.000Z');
const MINUTE = 60_000;

const table = (id: string, label: string): RestaurantTable =>
  ({
    id,
    label,
    roomId: 'room-1',
    position: { x: 0, y: 0 },
    rotation: 0,
    seats: 4,
    enabled: true,
    shape: 'round',
    diameter: 900,
  }) as unknown as RestaurantTable;

const TABLES = [table('table-12', '12'), table('t5', '5')];

const anomaly = (overrides: Partial<ScanAnomaly> = {}): ScanAnomaly => ({
  id: '8_table-12_rateLimited',
  restaurantId: 'restaurant-1',
  tableId: 'table-12',
  tableLabel: '12',
  kind: 'rateLimited',
  status: 'open',
  firstSeenAt: NOW - 10 * MINUTE,
  lastSeenAt: NOW - MINUTE,
  count: 3,
  ...overrides,
});

const session = (overrides: Partial<TableSession> = {}): TableSession => ({
  id: '8_table-12_guest-1',
  restaurantId: 'restaurant-1',
  tableId: 'table-12',
  guestUserId: 'guest-1',
  status: 'pending',
  startedAt: NOW - MINUTE,
  lastActiveAt: NOW - MINUTE,
  isAnonymousGuest: true,
  ...overrides,
});

describe('scanAnomalyRows', () => {
  it('writes the table number on the row rather than the id', () => {
    expect(scanAnomalyRows([anomaly()], TABLES, NOW)[0]).toMatchObject({
      tableId: 'table-12',
      label: '12',
      kindKey: 'scan-anomaly-rateLimited',
      count: 3,
    });
  });

  /**
   * Most recently seen first, which is neither of the other two lists on this
   * screen. Nobody is waiting on a row, so what belongs at the top is what is
   * still happening - not what arrived last, and not who has waited longest.
   */
  it('puts the row that is still happening at the top', () => {
    const rows = scanAnomalyRows(
      [
        anomaly({
          tableId: 't5',
          kind: 'disabledTable',
          lastSeenAt: NOW - 100,
        }),
        anomaly({ lastSeenAt: NOW - 20 * MINUTE }),
      ],
      TABLES,
      NOW,
    );

    expect(rows.map(({ tableId }) => tableId)).toEqual(['t5', 'table-12']);
  });

  /**
   * The collection keeps dismissed rows at their derived names, so "what the
   * collection holds" and "what the floor has not seen" are two questions.
   */
  it('drops the rows somebody has already read', () => {
    expect(
      scanAnomalyRows([anomaly({ status: 'dismissed' })], TABLES, NOW),
    ).toEqual([]);
  });

  it('marks a row that is still being raised and one that stopped', () => {
    const [active, stopped] = scanAnomalyRows(
      [
        anomaly({ lastSeenAt: NOW - MINUTE }),
        anomaly({
          tableId: 't5',
          kind: 'disabledTable',
          lastSeenAt: NOW - SCAN_ANOMALY_ACTIVE_WITHIN_MS - 1,
        }),
      ],
      TABLES,
      NOW,
    );

    expect(active.active).toBe(true);
    expect(stopped.active).toBe(false);
  });

  /**
   * The three kinds whose answer is to replace the code say so, and the two
   * whose answer is usually nothing do not. Eight phones at a four-top is
   * usually eight phones at a four-top.
   */
  it('suggests a rotation only where replacing the code is the answer', () => {
    const suggests = (kind: ScanAnomaly['kind']): boolean =>
      scanAnomalyRows([anomaly({ kind })], TABLES, NOW)[0].suggestsRotation;

    expect(suggests('rateLimited')).toBe(true);
    expect(suggests('outsideOpeningHours')).toBe(true);
    expect(suggests('disabledTable')).toBe(true);
    expect(suggests('manySessions')).toBe(false);
    expect(suggests('distantScan')).toBe(false);
  });

  it('carries the figures the two measured kinds come with', () => {
    const [rows] = scanAnomalyRows(
      [anomaly({ kind: 'distantScan', distanceMeters: 4200 })],
      TABLES,
      NOW,
    );

    expect(rows.distanceMeters).toBe(4200);
    expect(rows.sessionCount).toBeUndefined();
  });

  /**
   * A code whose table was deleted is one of the cases most worth reading, so
   * the row survives the table going - on the label the backend copied when it
   * raised the row, which is what that copy is for.
   */
  it('keeps a row whose table has left the plan, naming it from the copy', () => {
    const [row] = scanAnomalyRows(
      [anomaly({ tableId: 'gone', tableLabel: '21' })],
      TABLES,
      NOW,
    );

    expect(row.label).toBe('21');
  });

  /** A renumbered table is called what staff call it now. */
  it('prefers the plan over the copy where the plan still has the table', () => {
    const [row] = scanAnomalyRows(
      [anomaly({ tableLabel: 'the old number' })],
      TABLES,
      NOW,
    );

    expect(row.label).toBe('12');
  });
});

describe('pendingSessionRows', () => {
  /**
   * One row per table and not per phone. Three friends who each scan the code
   * on table 12 at the door are one party, and three rows would ask a host to
   * seat one table three times.
   */
  it('folds the phones at one table into a single party', () => {
    const rows = pendingSessionRows(
      [
        session({ id: 'a', guestUserId: 'guest-1' }),
        session({ id: 'b', guestUserId: 'guest-2' }),
        session({ id: 'c', guestUserId: 'guest-3' }),
      ],
      TABLES,
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tableId: 'table-12', guests: 3 });
  });

  /**
   * Measured from the earliest scan, so a fourth friend arriving does not reset
   * how long the party has been standing at the door.
   */
  it('measures the wait from the first phone to scan, not the last', () => {
    const [row] = pendingSessionRows(
      [
        session({ id: 'a', startedAt: NOW - 10 * MINUTE }),
        session({ id: 'b', guestUserId: 'guest-2', startedAt: NOW - 100 }),
      ],
      TABLES,
      NOW,
    );

    expect(row.id).toBe('a');
    expect(row.urgent).toBe(true);
  });

  /** The call list's direction: whoever has waited longest is answered first. */
  it('puts the party that has waited longest at the top', () => {
    const rows = pendingSessionRows(
      [
        session({ id: 'recent', tableId: 't5', startedAt: NOW - MINUTE }),
        session({ id: 'old', startedAt: NOW - 20 * MINUTE }),
      ],
      TABLES,
      NOW,
    );

    expect(rows.map(({ tableId }) => tableId)).toEqual(['table-12', 't5']);
  });

  it('marks nobody urgent before the threshold', () => {
    const [row] = pendingSessionRows(
      [session({ startedAt: NOW - PENDING_SESSION_URGENT_AFTER_MS + 1 })],
      TABLES,
      NOW,
    );

    expect(row.urgent).toBe(false);
  });

  /** A guest holding a phone in a dining room is one either way. */
  it('keeps a party whose table has left the plan', () => {
    const [row] = pendingSessionRows(
      [session({ tableId: 'gone' })],
      TABLES,
      NOW,
    );

    expect(row.label).toBe('');
  });
});
