import { TABLE_ORDER_STATUSES, TABLE_ORDER_STATUS_TRANSITIONS } from 'model';
import type { RestaurantTable, TableOrder, TableOrderStatus } from 'model';
import {
  groupOrdersByTable,
  openOrderCount,
  openOrdersByTable,
  ORDER_ACTION_KEYS,
  ORDER_STATUS_KEYS,
  orderActions,
  URGENT_AFTER_MS,
} from '../order-queue-groups';

/**
 * The rules the queue lives by, asserted without rendering anything
 * (GitHub issue #1105).
 *
 * The same split `table-plan-summary.spec.ts` uses: which table a row belongs
 * to, how long it has been waiting and which buttons it may offer are decisions
 * over plain data, and a test that had to mount a page to reach them would be
 * testing the page.
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

const order = (id: string, overrides: Partial<TableOrder> = {}): TableOrder =>
  ({
    id,
    restaurantId: 'restaurant-1',
    visitId: 'visit-1',
    tableId: 'table-12',
    sessionId: 'session-1',
    guestUserId: 'guest-1',
    status: 'submitted',
    lines: [
      { menuItemId: 'item-1', name: 'Margherita', price: 12, quantity: 1 },
    ],
    currency: 'EUR',
    total: 12,
    submittedAt: NOW - MINUTE,
    statusChangedAt: NOW - MINUTE,
    ...overrides,
  }) as TableOrder;

const tables = [table('table-12', '12'), table('table-5', '5')];

describe('the order queue grouping', () => {
  it('puts every order of one table in one group, named by its number', () => {
    const groups = groupOrdersByTable(
      [order('a'), order('b'), order('c', { tableId: 'table-5' })],
      tables,
      NOW,
    );

    expect(groups.map((group) => group.label)).toEqual(['12', '5']);
    expect(groups[0].orders.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(openOrderCount(groups)).toBe(3);
  });

  /**
   * Newest first, twice: the orders of a table, and the tables themselves. The
   * thing that just arrived is the thing nobody has looked at yet.
   */
  it('puts the newest order first and the table with it at the top', () => {
    const groups = groupOrdersByTable(
      [
        order('old', { submittedAt: NOW - 20 * MINUTE }),
        order('new', { submittedAt: NOW - MINUTE }),
        order('middle', {
          tableId: 'table-5',
          submittedAt: NOW - 10 * MINUTE,
        }),
      ],
      tables,
      NOW,
    );

    expect(groups.map((group) => group.tableId)).toEqual([
      'table-12',
      'table-5',
    ]);
    expect(groups[0].orders.map((entry) => entry.id)).toEqual(['new', 'old']);
  });

  /**
   * The group carries the *oldest* order's age rather than the newest, because
   * that is the number that says whether the table is a problem - and it is
   * read off the orders rather than off the first row, which is the newest.
   */
  it('ages the group by its oldest order, not by the one at the top', () => {
    const [group] = groupOrdersByTable(
      [
        order('old', { submittedAt: NOW - 45 * MINUTE }),
        order('new', { submittedAt: NOW - MINUTE }),
      ],
      tables,
      NOW,
    );

    expect(group.oldest).toEqual({
      key: 'table-status-elapsed-minutes',
      params: { hours: 0, minutes: 45 },
    });
    expect(group.orders[0].waiting).toEqual({
      key: 'table-status-elapsed-minutes',
      params: { hours: 0, minutes: 1 },
    });
  });

  it('marks an order that has waited too long, and its group with it', () => {
    const [group] = groupOrdersByTable(
      [
        order('late', { submittedAt: NOW - URGENT_AFTER_MS }),
        order('fresh', { submittedAt: NOW - MINUTE }),
      ],
      tables,
      NOW,
    );

    expect(group.urgent).toBe(true);
    expect(group.orders.map((entry) => entry.urgent)).toEqual([false, true]);
  });

  /**
   * A table deleted from the floor plan since the order was placed still gets
   * a group. Dropping it would lose an order somebody is waiting for in order
   * to tidy up a number.
   */
  it('keeps the orders of a table that is no longer on the plan', () => {
    const [group] = groupOrdersByTable(
      [order('a', { tableId: 'table-gone' })],
      tables,
      NOW,
    );

    expect(group.tableId).toBe('table-gone');
    expect(group.label).toBe('');
    expect(group.orders).toHaveLength(1);
  });

  it('carries the variant and the note a kitchen has to read', () => {
    const [group] = groupOrdersByTable(
      [
        order('a', {
          lines: [
            {
              menuItemId: 'item-1',
              name: 'Margherita',
              variantName: 'Large',
              price: 16,
              currency: 'EUR',
              quantity: 2,
              notes: 'No basil',
            },
          ],
        }),
      ],
      tables,
      NOW,
    );

    expect(group.orders[0].lines[0]).toEqual({
      name: 'Margherita',
      variantName: 'Large',
      quantity: 2,
      notes: 'No basil',
    });
  });

  it('is empty when nothing is outstanding', () => {
    expect(groupOrdersByTable([], tables, NOW)).toEqual([]);
    expect(openOrderCount([])).toBe(0);
  });
});

describe('the actions one order offers', () => {
  /**
   * Derived from the matrix and never listed beside it. A hand-written list of
   * buttons per status is a second copy of the state machine, and the copy that
   * drifts is the one that offers a button the backend refuses.
   */
  it.each(TABLE_ORDER_STATUSES)('offers exactly what %s may become', (from) => {
    expect(orderActions(from).map((action) => action.to)).toEqual([
      ...TABLE_ORDER_STATUS_TRANSITIONS[from],
    ]);
  });

  it('offers nothing at all once the order has ended', () => {
    expect(orderActions('served')).toEqual([]);
    expect(orderActions('cancelled')).toEqual([]);
  });

  /**
   * Cancelling is the one move that asks before it acts, and it says so here
   * rather than in the component - so a screen cannot forget to ask and send a
   * cancellation the backend then refuses for having no reason.
   */
  it('asks for a reason when cancelling and never otherwise', () => {
    const asking = TABLE_ORDER_STATUSES.flatMap((from) =>
      orderActions(from).filter((action) => action.needsReason),
    );

    expect(new Set(asking.map((action) => action.to))).toEqual(
      new Set(['cancelled']),
    );
  });

  it('names every status and every action it can reach', () => {
    TABLE_ORDER_STATUSES.forEach((status: TableOrderStatus) => {
      expect(ORDER_STATUS_KEYS[status]).toBeTruthy();
      expect(ORDER_ACTION_KEYS[status]).toBeTruthy();
    });
  });
});

describe('the counts the floor plan draws', () => {
  it('counts the open orders of each table', () => {
    expect([
      ...openOrdersByTable([
        order('a'),
        order('b'),
        order('c', { tableId: 'table-5' }),
      ]).entries(),
    ]).toEqual([
      ['table-12', 2],
      ['table-5', 1],
    ]);
  });

  /**
   * A table with nothing outstanding is absent rather than zero, so the plan
   * has one state for "no badge" instead of two.
   */
  it('leaves out a table with nothing outstanding', () => {
    expect(openOrdersByTable([]).has('table-12')).toBe(false);
  });
});
