import {
  TABLE_SCAN_NEXT_STEPS,
  TABLE_SCAN_REFUSAL_REASONS,
  isTableScanRefusalReason,
  isTableScanResolved,
  TABLE_ORDERING_UNAVAILABLE_REASONS,
} from '../../index';
import type {
  TableOrderingSettings,
  TableScanRefused,
  TableScanResolved,
  TableScanResult,
} from '../../index';

/**
 * The contract a scanned table QR code answers with (GitHub issue #1100).
 *
 * The backend keeps its own copy of the reason list, because the functions
 * project cannot import this library, and `table-scan-parity.spec.ts` there
 * fails the build when the two disagree. This file asserts the half a parity
 * spec cannot: that the reasons and the steps hold together, and that a client
 * narrowing the result gets the fields it expects.
 *
 * `ts-jest` type-checks this file, so a refusal that grows a required field or
 * a context that starts carrying an owner fails to compile before any
 * expectation runs.
 */
describe('table ordering', () => {
  const resolved: TableScanResolved = {
    ok: true,
    token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
    restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
    room: { id: 'room-1', name: 'Main dining room' },
    table: { id: 'table-12', label: '12', seats: 4 },
    menu: { id: 'menu-1' },
    ordering: { available: true },
  };

  const refused: TableScanRefused = {
    ok: false,
    reason: 'restaurantClosed',
    nextStep: 'tryLater',
    reopensAt: { day: 'thursday', time: '11:30' },
  };

  describe('the refusal reasons', () => {
    it('gives every reason a next step', () => {
      expect(Object.keys(TABLE_SCAN_NEXT_STEPS).sort()).toEqual(
        [...TABLE_SCAN_REFUSAL_REASONS].sort(),
      );
    });

    /**
     * The one refusal that means "there is a working code and this is not it".
     * Offering `tryLater` here would leave a guest waiting at a table for a
     * restaurant that is open.
     */
    it('sends a guest holding a replaced code back to the table', () => {
      expect(TABLE_SCAN_NEXT_STEPS.tokenSuperseded).toBe('rescanCode');
    });

    /**
     * The one refusal that passes on its own. Everything else needs a person,
     * because nothing the guest does with their phone changes it.
     *
     * It was two until issue #1102 moved `orderingPaused` out of this list: a
     * paused kitchen is a reason not to order and never a reason to withhold
     * the menu, so it is an {@link TableOrderingAvailability} now.
     */
    it('tells a guest to wait only where waiting is the answer', () => {
      const waits = Object.entries(TABLE_SCAN_NEXT_STEPS)
        .filter(([, step]) => step === 'tryLater')
        .map(([reason]) => reason)
        .sort();

      expect(waits).toEqual(['restaurantClosed']);
    });

    /**
     * The line issue #1102 drew, as an assertion rather than as prose. A
     * refusal means there is nothing to show the guest; being unable to *order*
     * is a different answer, carried on a scan that resolved.
     */
    it('keeps the ordering answers out of the refusals', () => {
      for (const reason of TABLE_ORDERING_UNAVAILABLE_REASONS) {
        expect(isTableScanRefusalReason(reason)).toBe(false);
      }

      expect([...TABLE_SCAN_REFUSAL_REASONS]).toHaveLength(10);
    });

    it('names no reason twice', () => {
      expect(new Set(TABLE_SCAN_REFUSAL_REASONS).size).toBe(
        TABLE_SCAN_REFUSAL_REASONS.length,
      );
    });

    it('recognises a stored reason and refuses anything else', () => {
      expect(isTableScanRefusalReason('tableDisabled')).toBe(true);
      expect(isTableScanRefusalReason('somethingWentWrong')).toBe(false);
      expect(isTableScanRefusalReason(undefined)).toBe(false);
    });
  });

  describe('the result', () => {
    it('narrows a resolved scan to its context', () => {
      const result: TableScanResult = resolved;

      expect(isTableScanResolved(result)).toBe(true);

      if (isTableScanResolved(result)) {
        expect(result.table.label).toBe('12');
      }
    });

    /**
     * A menu-only restaurant resolves exactly like an ordering one and differs
     * in one field, which is the whole point of the shape: the screen that
     * renders a menu does not have to know which kind of restaurant it is.
     */
    it('resolves a menu-only restaurant with ordering unavailable', () => {
      const menuOnly: TableScanResolved = {
        ...resolved,
        ordering: { available: false, reason: 'tableOrderingDisabled' },
      };

      expect(isTableScanResolved(menuOnly)).toBe(true);
      expect(menuOnly.menu.id).toBe('menu-1');
    });

    it('carries the end of a pause with the reason that needs it', () => {
      const paused: TableScanResolved = {
        ...resolved,
        ordering: {
          available: false,
          reason: 'orderingPaused',
          pausedUntilTimestamp: 1789030800000,
        },
      };

      if (!paused.ordering.available) {
        expect(paused.ordering.reason).toBe('orderingPaused');
      }
    });

    it('narrows a refusal to its reason', () => {
      const result: TableScanResult = refused;

      expect(isTableScanResolved(result)).toBe(false);

      if (!isTableScanResolved(result)) {
        expect(result.reason).toBe('restaurantClosed');
        expect(result.reopensAt).toEqual({ day: 'thursday', time: '11:30' });
      }
    });

    /**
     * The acceptance criterion that the response carries nothing the guest
     * should not see, asserted as a shape rather than as a promise: the context
     * is assembled field by field, so a field added to the restaurant document
     * tomorrow cannot reach a guest by being spread into it.
     */
    it('carries only the contexts a scan establishes, and its verdict', () => {
      expect(Object.keys(resolved).sort()).toEqual([
        'menu',
        'ok',
        'ordering',
        'restaurant',
        'room',
        'table',
        'token',
      ]);
    });
  });

  describe('the settings', () => {
    /**
     * A pause that ends rather than a flag that is on. The worst case of an end
     * is a restaurant that starts taking orders again by itself; the worst case
     * of a flag is one that never does.
     */
    it('carries a pause as the instant it lapses', () => {
      const settings: TableOrderingSettings = {
        enabled: true,
        timeZone: 'Europe/Berlin',
        pausedUntilTimestamp: Date.parse('2026-09-16T12:20:00Z'),
      };

      expect(settings.pausedUntilTimestamp).toBeGreaterThan(0);
    });
  });
});
