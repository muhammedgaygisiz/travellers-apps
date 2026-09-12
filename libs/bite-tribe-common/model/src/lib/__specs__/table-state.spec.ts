import {
  DEFAULT_TABLE_STATUS,
  TABLE_STATE_TRANSITIONS,
  TABLE_STATUSES,
  allowedTableStatusTransitions,
  canTransitionTableStatus,
  isTableStatus,
  tableStatusOf,
} from '../../index';
import type { RectangularTable, TableState, TableStatus } from '../../index';

/**
 * The transition matrix is the only executable part of the model, and the
 * thing issue #1091 asks to be tested exhaustively rather than by example: a
 * pair that is legal in one place and refused in another is the defect the
 * single definition exists to prevent, and only all forty-nine pairs prove it
 * is absent.
 *
 * The rest is the separation between what a table is and what it is doing,
 * asserted as key sets. `ts-jest` type-checks this file, so a state that grew
 * a geometry field fails to compile before any expectation runs.
 */
describe('live table state', () => {
  /**
   * The matrix as prose, transcribed from `ssot/pages/Table.md` rather than
   * derived from the code under test. A test that reads
   * `TABLE_STATE_TRANSITIONS` to decide what to expect passes whatever the
   * matrix says, including a matrix somebody edited by accident.
   */
  const expectedTransitions: Record<TableStatus, readonly TableStatus[]> = {
    available: ['reserved', 'occupied', 'cleaning', 'disabled'],
    reserved: ['occupied', 'available', 'disabled'],
    occupied: ['ordering', 'awaitingPayment', 'cleaning', 'available'],
    ordering: ['awaitingPayment', 'occupied', 'cleaning'],
    awaitingPayment: ['cleaning', 'available'],
    cleaning: ['available', 'disabled'],
    disabled: ['available'],
  };

  const everyPair: readonly (readonly [TableStatus, TableStatus])[] =
    TABLE_STATUSES.flatMap((from) =>
      TABLE_STATUSES.map((to) => [from, to] as const),
    );

  const seatedState: TableState = {
    tableId: 'table-12',
    restaurantId: 'china-wok',
    status: 'occupied',
    since: 1_757_664_000_000,
    updatedByUserId: 'staff-amelie',
    visitId: 'visit-8842',
  };

  it('covers every status the model knows, and nothing else', () => {
    expect([...TABLE_STATUSES]).toEqual([
      'available',
      'reserved',
      'occupied',
      'ordering',
      'awaitingPayment',
      'cleaning',
      'disabled',
    ]);
    expect(Object.keys(TABLE_STATE_TRANSITIONS).sort()).toEqual(
      [...TABLE_STATUSES].sort(),
    );
  });

  describe('the transition matrix', () => {
    it.each(TABLE_STATUSES)('lists the allowed targets of %s', (from) => {
      expect(allowedTableStatusTransitions(from)).toEqual(
        expectedTransitions[from],
      );
    });

    /**
     * Forty-nine assertions, one per ordered pair. The allowed and the
     * disallowed direction of the same pair are both here: `occupied` may
     * become `available` and `available` may not become `occupied` by any
     * route other than the one the matrix names.
     */
    it.each(everyPair)('decides %s to %s', (from, to) => {
      expect(canTransitionTableStatus(from, to)).toBe(
        expectedTransitions[from].includes(to),
      );
    });

    it('allows exactly nineteen of the forty-nine pairs', () => {
      const allowed = everyPair.filter(([from, to]) =>
        canTransitionTableStatus(from, to),
      );

      expect(everyPair).toHaveLength(49);
      expect(allowed).toHaveLength(19);
    });

    /**
     * Re-applying the status a table already holds is a retry, settled by an
     * idempotency key rather than by the matrix. Widening it here would let a
     * replayed seating reset `since`, which is the clock the staff view reads.
     */
    it.each(TABLE_STATUSES)(
      'refuses %s as a transition to itself',
      (status) => {
        expect(canTransitionTableStatus(status, status)).toBe(false);
        expect(allowedTableStatusTransitions(status)).not.toContain(status);
      },
    );

    it('leaves every status reachable and every status escapable', () => {
      TABLE_STATUSES.forEach((status) => {
        const reachable = TABLE_STATUSES.some((from) =>
          canTransitionTableStatus(from, status),
        );

        expect(reachable).toBe(true);
        expect(allowedTableStatusTransitions(status).length).toBeGreaterThan(0);
      });
    });

    /**
     * A blocked table is cleared by a staff member and by nothing else, which
     * is what makes it different from the owner's `enabled: false`.
     */
    it('lets a blocked table return only to available', () => {
      expect(allowedTableStatusTransitions('disabled')).toEqual(['available']);
    });

    it('refuses the backward steps the matrix does not name', () => {
      expect(canTransitionTableStatus('occupied', 'reserved')).toBe(false);
      expect(canTransitionTableStatus('awaitingPayment', 'occupied')).toBe(
        false,
      );
    });
  });

  describe('a table with no state document', () => {
    it('reads as available', () => {
      expect(tableStatusOf(undefined)).toBe('available');
      expect(DEFAULT_TABLE_STATUS).toBe('available');
    });

    it('reads its own status once it has one', () => {
      expect(tableStatusOf(seatedState)).toBe('occupied');
    });
  });

  describe('narrowing a status that came off the wire', () => {
    it.each(TABLE_STATUSES)('accepts %s', (status) => {
      expect(isTableStatus(status)).toBe(true);
    });

    it.each([
      'Available',
      'awaiting_payment',
      'seated',
      '',
      null,
      undefined,
      7,
      { status: 'available' },
    ])('rejects %p', (value) => {
      expect(isTableStatus(value)).toBe(false);
    });
  });

  describe('separation from the floor plan', () => {
    const table: RectangularTable = {
      id: 'table-12',
      label: '12',
      roomId: 'main',
      shape: 'rectangle',
      size: { width: 1600, height: 800 },
      position: { x: 5200, y: 1200 },
      rotation: 0,
      seats: 6,
      enabled: true,
      qrTokenId: 'tok_r7Kq2mXbN4',
    };

    /**
     * The acceptance criterion of issue #1091, as a fact about the shapes
     * rather than as a rule about call sites: a state write names no field a
     * plan write names, so neither can carry the other's data however the
     * caller is written.
     */
    it('shares no field name with the table it describes', () => {
      const shared = Object.keys(seatedState).filter((key) =>
        Object.keys(table).includes(key),
      );

      expect(shared).toEqual([]);
    });

    it('carries no geometry, capacity or label', () => {
      expect(Object.keys(seatedState).sort()).toEqual([
        'restaurantId',
        'since',
        'status',
        'tableId',
        'updatedByUserId',
        'visitId',
      ]);
      ['position', 'rotation', 'size', 'diameter', 'seats', 'label'].forEach(
        (field) => expect(seatedState).not.toHaveProperty(field),
      );
    });

    it('carries no status on the table itself', () => {
      expect(table).not.toHaveProperty('status');
      expect(table).not.toHaveProperty('state');
    });

    /**
     * The two `disabled`s. The owner's is a field on the table and means out
     * of service until they say otherwise; the staff one is a status and means
     * blocked for this service. A table can be in service and blocked, or out
     * of service and untouched by staff all evening.
     */
    it('distinguishes a table taken out of service from one blocked right now', () => {
      const blockedNow: TableState = {
        tableId: table.id,
        restaurantId: 'china-wok',
        status: 'disabled',
        since: 1_757_664_000_000,
        updatedByUserId: 'staff-amelie',
        note: 'Wobbly leg',
      };
      const outOfService: RectangularTable = { ...table, enabled: false };

      expect(table.enabled).toBe(true);
      expect(blockedNow.status).toBe('disabled');
      expect(tableStatusOf(undefined)).toBe('available');
      expect(outOfService.enabled).toBe(false);
    });
  });

  describe('the fields a transition records', () => {
    it('names the actor and the moment for every state', () => {
      expect(seatedState.updatedByUserId).toBe('staff-amelie');
      expect(seatedState.since).toBe(1_757_664_000_000);
    });

    it('points at the open visit while there is one, and otherwise at none', () => {
      const freed: TableState = {
        tableId: seatedState.tableId,
        restaurantId: seatedState.restaurantId,
        status: 'cleaning',
        since: seatedState.since + 3_600_000,
        updatedByUserId: 'staff-tomas',
      };

      expect(seatedState.visitId).toBe('visit-8842');
      expect(freed).not.toHaveProperty('visitId');
      expect(canTransitionTableStatus(seatedState.status, freed.status)).toBe(
        true,
      );
    });
  });
});
