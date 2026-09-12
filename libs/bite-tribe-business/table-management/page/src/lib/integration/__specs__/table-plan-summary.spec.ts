import { RestaurantTable, TableState, TableStatus } from 'model';
import {
  statesByTable,
  statusCounts,
  statusOfTable,
  SUMMARY_STATUSES,
  summaryRows,
} from '../table-plan-summary';

const table = (id: string, roomId = 'room-1'): RestaurantTable => ({
  id,
  label: id,
  roomId,
  position: { x: 1000, y: 1000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
});

const state = (tableId: string, status: TableStatus): TableState => ({
  tableId,
  restaurantId: 'restaurant-1',
  status,
  since: 1_760_000_000_000,
  updatedByUserId: 'host-1',
});

describe('table plan summary', () => {
  describe('statusOfTable', () => {
    /**
     * The ordinary case, not a gap: no restaurant starts with a state document
     * per table, and nothing writes one until a staff member first acts on that
     * table.
     */
    it('reads a table with no state document as free', () => {
      expect(statusOfTable(table('t1'), new Map())).toBe('available');
    });

    it('reads the stored status when there is one', () => {
      expect(
        statusOfTable(table('t1'), statesByTable([state('t1', 'occupied')])),
      ).toBe('occupied');
    });
  });

  describe('statusCounts', () => {
    /**
     * Counted over the *tables* rather than over the state documents. A
     * restaurant using this view for the first time has no state documents at
     * all, and a count taken from them would report an empty room instead of
     * one where everything is free.
     */
    it('counts a restaurant that has never used the view as all free', () => {
      const counts = statusCounts(
        [table('t1'), table('t2'), table('t3')],
        new Map(),
      );

      expect(counts.available).toBe(3);
      expect(counts.occupied).toBe(0);
    });

    it('counts each status of a room in service', () => {
      const counts = statusCounts(
        [table('t1'), table('t2'), table('t3'), table('t4')],
        statesByTable([
          state('t1', 'occupied'),
          state('t2', 'occupied'),
          state('t3', 'cleaning'),
        ]),
      );

      expect(counts).toEqual({
        available: 1,
        reserved: 0,
        occupied: 2,
        ordering: 0,
        awaitingPayment: 0,
        cleaning: 1,
        disabled: 0,
      });
    });

    /** A state for a table in another room, or a deleted one, counts nowhere. */
    it('ignores a state whose table is not in the list', () => {
      const counts = statusCounts(
        [table('t1')],
        statesByTable([state('t1', 'reserved'), state('gone', 'occupied')]),
      );

      expect(counts.reserved).toBe(1);
      expect(counts.occupied).toBe(0);
    });
  });

  describe('summaryRows', () => {
    const counts = (
      over: Partial<Record<TableStatus, number>> = {},
    ): Record<TableStatus, number> => ({
      available: 0,
      reserved: 0,
      occupied: 0,
      ordering: 0,
      awaitingPayment: 0,
      cleaning: 0,
      disabled: 0,
      ...over,
    });

    /**
     * A bar whose entries came and went as the room changed would be one staff
     * had to re-read rather than glance at, so the four that describe a service
     * are always there and always in the same order.
     */
    it('always shows the four named statuses, in order, even at zero', () => {
      expect(summaryRows(counts()).map((row) => row.status)).toEqual([
        ...SUMMARY_STATUSES,
      ]);
    });

    it('adds the others only once a table is actually in one', () => {
      const rows = summaryRows(counts({ disabled: 2 }));

      expect(rows.map((row) => row.status)).toEqual([
        ...SUMMARY_STATUSES,
        'disabled',
      ]);
      expect(rows[rows.length - 1].count).toBe(2);
    });

    it('keeps the extras in lifecycle order after the named four', () => {
      const rows = summaryRows(
        counts({ disabled: 1, ordering: 3, awaitingPayment: 2 }),
      );

      expect(
        rows.slice(SUMMARY_STATUSES.length).map((row) => row.status),
      ).toEqual(['ordering', 'awaitingPayment', 'disabled']);
    });
  });
});
