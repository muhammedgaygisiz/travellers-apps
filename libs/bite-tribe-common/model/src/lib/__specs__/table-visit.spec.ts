import {
  TABLE_STATUS_AFTER_VISIT,
  TABLE_VISIT_END_STATUSES,
  TABLE_VISIT_STATUSES,
  canTransitionTableStatus,
  isTableVisitOpen,
  isTableVisitStatus,
} from '../../index';
import type { RestaurantTable, TableState, TableVisit } from '../../index';

/**
 * What a visit is, as opposed to what a table is and what a table is doing
 * (GitHub issue #1095).
 *
 * The executable parts are small on purpose - a visit has no state machine,
 * because ending it is one-way - so most of this file asserts the shapes and
 * the one rule the model carries as data: a table whose visit has ended lands
 * on a status that needs an explicit next action.
 *
 * `ts-jest` type-checks this file, so a visit that grew a geometry field or an
 * order total fails to compile before any expectation runs.
 */
describe('table visits', () => {
  const openedAt = 1_757_664_000_000;

  const openVisit: TableVisit = {
    id: 'visit-8842',
    restaurantId: 'china-wok',
    tableId: 'table-12',
    status: 'open',
    openedAt,
    guestCount: 4,
    openedByUserId: 'staff-amelie',
  };

  const closedVisit: TableVisit = {
    ...openVisit,
    status: 'closed',
    closedAt: openedAt + 5_400_000,
    closedByUserId: 'staff-tomas',
  };

  it('covers every status the model knows, and nothing else', () => {
    expect([...TABLE_VISIT_STATUSES]).toEqual(['open', 'closed', 'abandoned']);
  });

  it('treats both endings as endings and only the first as a beginning', () => {
    expect([...TABLE_VISIT_END_STATUSES]).toEqual(['closed', 'abandoned']);
    expect(TABLE_VISIT_END_STATUSES).not.toContain('open');
    expect(TABLE_VISIT_STATUSES).toHaveLength(
      TABLE_VISIT_END_STATUSES.length + 1,
    );
  });

  describe('whether the party is still there', () => {
    it('reads an open visit as open', () => {
      expect(isTableVisitOpen(openVisit)).toBe(true);
    });

    /**
     * `abandoned` as well as `closed`, which is the reason this is a function
     * rather than a comparison at each call site: a table left open overnight
     * has no party at it either, and the one call site that spelled the check
     * itself would be the one that kept the table blocked.
     */
    it.each(TABLE_VISIT_END_STATUSES)('reads a %s visit as ended', (status) => {
      expect(isTableVisitOpen({ status })).toBe(false);
    });
  });

  describe('narrowing a status that came out of the database', () => {
    it.each(TABLE_VISIT_STATUSES)('accepts %s', (status) => {
      expect(isTableVisitStatus(status)).toBe(true);
    });

    it.each(['Open', 'OPEN', 'seated', 'paid', '', null, undefined, 1, {}])(
      'rejects %p',
      (value) => {
        expect(isTableVisitStatus(value)).toBe(false);
      },
    );
  });

  describe('the status a table lands on when a visit ends', () => {
    /**
     * The acceptance criterion of issue #1095 - "tables are not silently
     * reused" - as a value both the backend and the staff view read, rather
     * than as a sentence each of them implements.
     */
    it('needs an explicit next action before the table is reusable', () => {
      expect(TABLE_STATUS_AFTER_VISIT).toBe('cleaning');
      expect(
        canTransitionTableStatus(TABLE_STATUS_AFTER_VISIT, 'available'),
      ).toBe(true);
    });

    it('is reachable from every status that can hold a party', () => {
      (['occupied', 'ordering', 'awaitingPayment'] as const).forEach((from) =>
        expect(canTransitionTableStatus(from, TABLE_STATUS_AFTER_VISIT)).toBe(
          true,
        ),
      );
    });
  });

  describe('what a visit records and what it does not', () => {
    it('names the party, the table and both ends of the visit', () => {
      expect(Object.keys(closedVisit).sort()).toEqual([
        'closedAt',
        'closedByUserId',
        'guestCount',
        'id',
        'openedAt',
        'openedByUserId',
        'restaurantId',
        'status',
        'tableId',
      ]);
    });

    /**
     * Absent rather than zero while the visit runs, so "still going" is a
     * missing field instead of a sentinel each reader has to know about.
     */
    it('leaves the closing fields off an open visit', () => {
      expect(openVisit).not.toHaveProperty('closedAt');
      expect(openVisit).not.toHaveProperty('closedByUserId');
      expect(closedVisit.closedAt).toBe(openedAt + 5_400_000);
      expect(closedVisit.closedByUserId).toBe('staff-tomas');
    });

    /**
     * A host in a rush is not asked for a party size, and refusing the seating
     * over it would cost more than the field is worth.
     */
    it('accepts a visit seated without a recorded party size', () => {
      const inARush: TableVisit = {
        id: 'visit-8843',
        restaurantId: 'china-wok',
        tableId: 'table-5',
        status: 'open',
        openedAt,
        openedByUserId: 'staff-amelie',
      };

      expect(inARush).not.toHaveProperty('guestCount');
      expect(isTableVisitOpen(inARush)).toBe(true);
    });

    /**
     * The orders of issue #1072 and the payment of issue #1073 are a
     * subcollection and a document of their own. A total copied onto the visit
     * would be a cache of a collection that changes while the party sits there.
     */
    it('carries no order, no total and no geometry', () => {
      ['orders', 'total', 'items', 'position', 'seats', 'label'].forEach(
        (field) => expect(closedVisit).not.toHaveProperty(field),
      );
    });
  });

  describe('the visit, the table and the live state', () => {
    const table: RestaurantTable = {
      id: 'table-12',
      label: '12',
      roomId: 'main',
      shape: 'round',
      diameter: 900,
      position: { x: 5200, y: 1200 },
      rotation: 0,
      seats: 6,
      enabled: true,
      qrTokenId: 'tok_r7Kq2mXbN4',
    };

    const seatedState: TableState = {
      tableId: table.id,
      restaurantId: openVisit.restaurantId,
      status: 'occupied',
      since: openedAt,
      updatedByUserId: openVisit.openedByUserId,
      visitId: openVisit.id,
    };

    /**
     * They point at each other and neither owns the other. The backend writes
     * both in one transaction, so a visit open at a table whose state points at
     * nothing cannot exist.
     */
    it('pairs the state pointer with the visit that answers it', () => {
      expect(seatedState.visitId).toBe(openVisit.id);
      expect(openVisit.tableId).toBe(seatedState.tableId);
    });

    /**
     * The move of issue #1095 keeps the identity and changes where the party
     * is sitting. Every order already pointing at this visit still points at
     * it, which is the difference between a move and a close-and-reopen.
     */
    it('keeps its identity when the party moves table', () => {
      const moved: TableVisit = { ...openVisit, tableId: 'table-5' };

      expect(moved.id).toBe(openVisit.id);
      expect(moved.openedAt).toBe(openVisit.openedAt);
      expect(moved.openedByUserId).toBe(openVisit.openedByUserId);
      expect(moved.guestCount).toBe(openVisit.guestCount);
      expect(moved.tableId).not.toBe(openVisit.tableId);
    });

    /**
     * A plain id and never a reference, which is the whole of how the record
     * outlives the table. A restaurant that rearranges its dining room must
     * still be able to read what happened at the table it removed.
     */
    it('still names its table after the table is gone from the plan', () => {
      const plan: RestaurantTable[] = [];

      expect(closedVisit.tableId).toBe(table.id);
      expect(plan.some((entry) => entry.id === closedVisit.tableId)).toBe(
        false,
      );
      expect(typeof closedVisit.tableId).toBe('string');
    });
  });
});
