import {
  ATTENDED_TABLE_STATUSES,
  MAX_TABLE_ASSISTANCE_REQUESTERS,
  TABLE_ASSISTANCE_COOLDOWN_MS,
  TABLE_ASSISTANCE_KINDS,
  TABLE_ASSISTANCE_REFUSAL_REASONS,
  TABLE_ASSISTANCE_STATUSES,
  TABLE_STATUS_AFTER_BILL_REQUEST,
  isOpenAssistanceRequest,
  isTableAssistanceKind,
  isTableAssistanceRaised,
  isTableAssistanceStatus,
  openAssistanceByTable,
  tableAssistanceRequestId,
} from '../table-assistance';
import type {
  TableAssistanceKind,
  TableAssistanceRequest,
} from '../table-assistance';

/**
 * A guest asking for a waiter (GitHub issue #1106).
 *
 * What is worth asserting here is the derivation and the two sets, because
 * those are the parts that are *load-bearing rather than descriptive*: the
 * document name is the rate limit, and the table statuses are what stop a
 * marker being drawn on an empty table.
 */

const request = (
  overrides: Partial<TableAssistanceRequest> = {},
): TableAssistanceRequest => ({
  id: '7_table-1_callStaff',
  restaurantId: 'restaurant-1',
  tableId: 'table-1',
  kind: 'callStaff',
  status: 'open',
  requestedAt: 1_700_000_000_000,
  lastRequestedAt: 1_700_000_000_000,
  requestedByUserIds: ['guest-1'],
  ...overrides,
});

describe('tableAssistanceRequestId', () => {
  it('names one kind of signal at one table', () => {
    expect(tableAssistanceRequestId('table-12', 'requestBill')).toBe(
      '8_table-12_requestBill',
    );
  });

  /**
   * The whole reason the name carries a length. Without it, a table called
   * `a_b` and a table called `a` with a `b` in front of the kind would name one
   * document - and two tables sharing a signal means a waiter walking to the
   * wrong one, or a bill request clearing somebody else's.
   */
  it('gives two tables two names even where the ids overlap', () => {
    const first = tableAssistanceRequestId('a_b', 'callStaff');
    const second = tableAssistanceRequestId('a', 'callStaff');

    expect(first).not.toBe(second);
  });

  /**
   * The same table and the same kind is always the same document, which is
   * what makes a repeated tap join the signal that is up rather than raise a
   * second one. It is the acceptance criterion "repeated taps do not create
   * repeated signals", asserted at the level it is actually enforced.
   */
  it('answers the same name for the same table and kind', () => {
    expect(tableAssistanceRequestId('table-3', 'callStaff')).toBe(
      tableAssistanceRequestId('table-3', 'callStaff'),
    );
  });

  it('gives the two kinds at one table two names', () => {
    expect(tableAssistanceRequestId('table-3', 'callStaff')).not.toBe(
      tableAssistanceRequestId('table-3', 'requestBill'),
    );
  });
});

describe('the closed sets', () => {
  it('knows its own kinds and nothing else', () => {
    expect(TABLE_ASSISTANCE_KINDS.every(isTableAssistanceKind)).toBe(true);
    expect(isTableAssistanceKind('requestWine')).toBe(false);
    expect(isTableAssistanceKind(undefined)).toBe(false);
  });

  it('knows its own statuses and nothing else', () => {
    expect(TABLE_ASSISTANCE_STATUSES.every(isTableAssistanceStatus)).toBe(true);
    expect(isTableAssistanceStatus('resolved')).toBe(false);
  });

  it('carries a reason for being asked again too soon', () => {
    expect(TABLE_ASSISTANCE_REFUSAL_REASONS).toContain('cooldown');
  });
});

describe('ATTENDED_TABLE_STATUSES', () => {
  /**
   * The one place this and the statuses an order may be placed from
   * deliberately disagree. A party that has asked for the bill has stopped
   * ordering and has not stopped needing a waiter, so the second request - the
   * one a guest makes because nobody came - has to be admitted from the very
   * status the first one caused.
   */
  it('admits a table awaiting payment', () => {
    expect(ATTENDED_TABLE_STATUSES).toContain('awaitingPayment');
  });

  it('refuses every table with nobody sitting at it', () => {
    for (const status of [
      'available',
      'reserved',
      'cleaning',
      'disabled',
    ] as const) {
      expect(ATTENDED_TABLE_STATUSES).not.toContain(status);
    }
  });

  /** The status a bill request causes has to be one it can be asked from. */
  it('admits the status a bill request lands the table on', () => {
    expect(ATTENDED_TABLE_STATUSES).toContain(TABLE_STATUS_AFTER_BILL_REQUEST);
  });
});

describe('isOpenAssistanceRequest', () => {
  it('is true while nobody has taken it', () => {
    expect(isOpenAssistanceRequest(request())).toBe(true);
  });

  it('is false once somebody has', () => {
    expect(isOpenAssistanceRequest(request({ status: 'acknowledged' }))).toBe(
      false,
    );
  });
});

describe('openAssistanceByTable', () => {
  it('groups the open signals under the table that raised them', () => {
    const grouped = openAssistanceByTable([
      request({ tableId: 'table-1', kind: 'callStaff' }),
      request({ tableId: 'table-1', kind: 'requestBill' }),
      request({ tableId: 'table-2', kind: 'callStaff' }),
    ]);

    expect(grouped.get('table-1')?.map((entry) => entry.kind)).toEqual([
      'callStaff',
      'requestBill',
    ] satisfies TableAssistanceKind[]);
    expect(grouped.get('table-2')).toHaveLength(1);
  });

  /**
   * Acknowledged signals stay in the collection at their derived names, so a
   * grouping that did not drop them would leave a marker on the floor plan
   * that nothing could ever clear.
   */
  it('drops the ones somebody has already answered', () => {
    const grouped = openAssistanceByTable([
      request({ tableId: 'table-1', status: 'acknowledged' }),
    ]);

    expect(grouped.has('table-1')).toBe(false);
  });

  /** Absent rather than an empty list, so "no marker" is one state. */
  it('leaves a table nobody is calling from out of the map', () => {
    expect(openAssistanceByTable([]).has('table-1')).toBe(false);
  });
});

describe('isTableAssistanceRaised', () => {
  it('separates a signal that went up from one that was refused', () => {
    expect(
      isTableAssistanceRaised({
        ok: true,
        request: request(),
        alreadyOpen: false,
        tableStatus: 'occupied',
      }),
    ).toBe(true);

    expect(isTableAssistanceRaised({ ok: false, reason: 'cooldown' })).toBe(
      false,
    );
  });
});

describe('the two limits', () => {
  /**
   * A minute. Short enough that a guest whose waiter never came can ask again
   * at about the point a person would, and long enough that the room view
   * cannot be filled by one impatient table.
   */
  it('holds the cooldown at a minute', () => {
    expect(TABLE_ASSISTANCE_COOLDOWN_MS).toBe(60_000);
  });

  it('caps the requester list at a party rather than a room', () => {
    expect(MAX_TABLE_ASSISTANCE_REQUESTERS).toBeGreaterThan(1);
    expect(MAX_TABLE_ASSISTANCE_REQUESTERS).toBeLessThan(100);
  });
});
