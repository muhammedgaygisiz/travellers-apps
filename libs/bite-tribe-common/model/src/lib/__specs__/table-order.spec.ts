import {
  INITIAL_TABLE_ORDER_STATUS,
  MAX_ORDER_LINES,
  MAX_ORDER_LINE_QUANTITY,
  TABLE_ORDERS_COLLECTION,
  TABLE_ORDER_END_STATUSES,
  TABLE_ORDER_REFUSAL_REASONS,
  TABLE_ORDER_STATUSES,
  TABLE_ORDER_REQUEST_ID_PREFIX,
  TABLE_ORDER_STATUS_TRANSITIONS,
  canTransitionTableOrderStatus,
  createOrderLineSnapshot,
  isTableOrderEnded,
  isTableOrderStatus,
  isTableOrderRequestId,
  isTableOrderSubmitted,
  tableOrderDocumentId,
  tableOrderTotal,
  tableOrdersTotal,
} from '../../index';
import type {
  OrderLineSnapshot,
  SubmitTableOrderResult,
  TableOrder,
} from '../../index';

/**
 * What a party sent to the kitchen, and the lifecycle it then moves along
 * (GitHub issue #1103).
 *
 * Two things here are contracts rather than conveniences, and they are what
 * this file is for.
 *
 * **The total.** The running figure on the guest's phone and the number stored
 * on the order both come from `tableOrderTotal`. If it ever disagreed with
 * itself across a variant or a quantity, the guest would agree to one amount
 * and the restaurant would record another, and nothing at runtime compares the
 * two.
 *
 * **The transition matrix.** The staff queue of issue #1105 decides which
 * buttons to offer by reading it and the backend decides which moves to accept
 * by reading its copy, so a row that admits a move out of a finished order is a
 * served dish being cancelled an hour later.
 *
 * `ts-jest` type-checks this file, so an order that grew a field or lost one
 * fails to compile before any expectation runs.
 */
describe('table orders', () => {
  const submittedAt = 1_757_664_000_000;

  const margherita: OrderLineSnapshot = {
    menuItemId: 'item-margherita',
    name: 'Margherita',
    price: 12,
    currency: 'EUR',
    quantity: 2,
    notes: 'no basil',
  };

  const tiramisu: OrderLineSnapshot = {
    menuItemId: 'item-tiramisu',
    name: 'Tiramisu',
    price: 6,
    currency: 'EUR',
    quantity: 1,
  };

  const order: TableOrder = {
    id: 'order-4471',
    restaurantId: 'china-wok',
    visitId: 'visit-8842',
    tableId: 'table-12',
    sessionId: '8_table-12_guest-alice',
    guestUserId: 'guest-alice',
    status: 'submitted',
    lines: [margherita, tiramisu],
    currency: 'EUR',
    total: 30,
    submittedAt,
    statusChangedAt: submittedAt,
  };

  describe('the lifecycle', () => {
    it('covers every status the model knows, and nothing else', () => {
      expect([...TABLE_ORDER_STATUSES]).toEqual([
        'submitted',
        'accepted',
        'preparing',
        'served',
        'cancelled',
      ]);
    });

    it('starts every order in the one status this issue writes', () => {
      expect(INITIAL_TABLE_ORDER_STATUS).toBe('submitted');
      expect(TABLE_ORDER_STATUSES).toContain(INITIAL_TABLE_ORDER_STATUS);
    });

    it('treats both endings as endings and neither as a beginning', () => {
      expect([...TABLE_ORDER_END_STATUSES]).toEqual(['served', 'cancelled']);
      expect(isTableOrderEnded({ status: 'served' })).toBe(true);
      expect(isTableOrderEnded({ status: 'cancelled' })).toBe(true);
      expect(isTableOrderEnded(order)).toBe(false);
    });

    /**
     * A kitchen that runs out of a dish halfway through preparing it has to be
     * able to say so, which is why `cancelled` is reachable from every live
     * status rather than from `submitted` alone.
     */
    it('lets a live order be cancelled from wherever it has got to', () => {
      expect(canTransitionTableOrderStatus('submitted', 'cancelled')).toBe(
        true,
      );
      expect(canTransitionTableOrderStatus('accepted', 'cancelled')).toBe(true);
      expect(canTransitionTableOrderStatus('preparing', 'cancelled')).toBe(
        true,
      );
    });

    /**
     * A dish the guest has eaten is not cancellable, and the correction for one
     * that was wrong is a matter for the bill rather than for this field.
     */
    it('lets nothing leave a finished order', () => {
      for (const ended of TABLE_ORDER_END_STATUSES) {
        expect(TABLE_ORDER_STATUS_TRANSITIONS[ended]).toEqual([]);

        for (const to of TABLE_ORDER_STATUSES) {
          expect(canTransitionTableOrderStatus(ended, to)).toBe(false);
        }
      }
    });

    /**
     * A restaurant that plates a dessert as it is ordered has no preparing
     * stage worth recording, and forcing one would have staff tapping through a
     * status to reach the one they meant.
     */
    it('lets preparing be skipped', () => {
      expect(canTransitionTableOrderStatus('accepted', 'served')).toBe(true);
    });

    it('refuses re-applying the status an order already holds', () => {
      for (const status of TABLE_ORDER_STATUSES) {
        expect(canTransitionTableOrderStatus(status, status)).toBe(false);
      }
    });

    it('gives every status a row, naming only statuses that exist', () => {
      expect(Object.keys(TABLE_ORDER_STATUS_TRANSITIONS).sort()).toEqual(
        [...TABLE_ORDER_STATUSES].sort(),
      );

      for (const row of Object.values(TABLE_ORDER_STATUS_TRANSITIONS)) {
        for (const to of row) {
          expect(TABLE_ORDER_STATUSES).toContain(to);
        }
      }
    });

    it('narrows a stored status, and refuses one it does not know', () => {
      expect(isTableOrderStatus('preparing')).toBe(true);
      expect(isTableOrderStatus('refunded')).toBe(false);
      expect(isTableOrderStatus(undefined)).toBe(false);
      expect(isTableOrderStatus(3)).toBe(false);
    });
  });

  describe('the total', () => {
    it('multiplies each line by its quantity and sums them', () => {
      expect(tableOrderTotal(order.lines)).toBe(30);
      expect(tableOrderTotal(order.lines)).toBe(order.total);
    });

    it('is zero for an order with no lines', () => {
      expect(tableOrderTotal([])).toBe(0);
    });

    /**
     * The variant's price, never the dish's, because that is the number the
     * guest was shown. The cart totals provisional snapshots taken by the same
     * function the order line is built with, so this is the arithmetic both
     * sides run.
     */
    it('prices a variant line at the variant', () => {
      const large = createOrderLineSnapshot({
        item: {
          id: 'item-margherita',
          name: 'Margherita',
          description: '',
          price: 12,
        },
        variant: {
          id: 'variant-large',
          name: 'Large',
          description: '',
          price: 16,
        },
        quantity: 2,
        currency: 'EUR',
      });

      expect(large.price).toBe(16);
      expect(large.name).toBe('Margherita');
      expect(tableOrderTotal([large])).toBe(32);
    });
  });

  describe('the running total across orders', () => {
    const second: TableOrder = {
      ...order,
      id: 'order-4472',
      lines: [tiramisu],
      total: 6,
      submittedAt: submittedAt + 600_000,
      statusChangedAt: submittedAt + 600_000,
    };

    it('sums what has been ordered so far', () => {
      expect(tableOrdersTotal([order, second])).toBe(36);
    });

    it('is zero before anything has been ordered', () => {
      expect(tableOrdersTotal([])).toBe(0);
    });

    /**
     * The one status that changes the arithmetic. A dish that will not be
     * cooked will not be billed, and a total that kept it would tell a guest
     * they owe for the Margherita the kitchen ran out of.
     */
    it('leaves out an order the restaurant cancelled', () => {
      expect(
        tableOrdersTotal([{ ...order, status: 'cancelled' }, second]),
      ).toBe(6);
    });

    /**
     * Everything else counts from the moment it is sent. A total that waited
     * for `served` would read as zero for the first half of a meal.
     */
    it('counts an order at every status that is not cancelled', () => {
      const counted = TABLE_ORDER_STATUSES.filter(
        (status) => status !== 'cancelled',
      ).map((status) => ({ ...order, status }));

      expect(tableOrdersTotal(counted)).toBe(30 * counted.length);
    });
  });

  /**
   * Declared here and written by issue #1105, which is what makes it worth a
   * case of its own: the guarantee is that a cancellation is explained rather
   * than silent, and the screen renders this field to keep it.
   */
  describe('a cancellation', () => {
    it('carries the reason staff gave, where they gave one', () => {
      const cancelled: TableOrder = {
        ...order,
        status: 'cancelled',
        cancellationReason: 'The kitchen has run out of tiramisu',
      };

      expect(cancelled.cancellationReason).toBe(
        'The kitchen has run out of tiramisu',
      );
      expect(isTableOrderEnded(cancelled)).toBe(true);
    });

    it('is a complete order without one', () => {
      const cancelled: TableOrder = { ...order, status: 'cancelled' };

      expect(cancelled.cancellationReason).toBeUndefined();
    });
  });

  describe('what comes back from a submission', () => {
    it('narrows a placed order', () => {
      const placed: SubmitTableOrderResult = {
        ok: true,
        order,
        tableStatus: 'ordering',
      };

      expect(isTableOrderSubmitted(placed)).toBe(true);

      if (isTableOrderSubmitted(placed)) {
        expect(placed.order.total).toBe(30);
      }
    });

    /**
     * A guest whose Margherita sold out has not hit an error, and the sentence
     * they are owed names the dish. The refusal is a value with the item on it
     * for exactly that reason.
     */
    it('narrows a refusal, and keeps the item it is about', () => {
      const refused: SubmitTableOrderResult = {
        ok: false,
        reason: 'itemUnavailable',
        item: { menuItemId: 'item-margherita', name: 'Margherita' },
      };

      expect(isTableOrderSubmitted(refused)).toBe(false);

      if (!isTableOrderSubmitted(refused)) {
        expect(refused.item?.name).toBe('Margherita');
      }
    });

    it('carries a closed set of reasons, each one distinct', () => {
      expect(new Set(TABLE_ORDER_REFUSAL_REASONS).size).toBe(
        TABLE_ORDER_REFUSAL_REASONS.length,
      );
      expect(TABLE_ORDER_REFUSAL_REASONS).toContain('priceChanged');
      expect(TABLE_ORDER_REFUSAL_REASONS).toContain('itemUnavailable');
      expect(TABLE_ORDER_REFUSAL_REASONS).toContain('menuCurrencyMissing');
    });
  });

  it('stores orders under the visit', () => {
    expect(TABLE_ORDERS_COLLECTION).toBe('orders');
  });

  it('caps a line and an order at figures a real table stays under', () => {
    expect(MAX_ORDER_LINE_QUANTITY).toBe(99);
    expect(MAX_ORDER_LINES).toBe(60);
  });

  /**
   * The idempotency key (GitHub issue #1108).
   *
   * The pattern is not a formality. The key becomes a Firestore document name,
   * so it has to be a legal one - and it has to be one no auto-generated id
   * could ever be, or a client could hand in a twenty-character alphanumeric
   * string that happens to name somebody else's order and be answered with
   * their dinner.
   */
  describe('the key that makes a retry safe', () => {
    it('names the order document after the key', () => {
      expect(tableOrderDocumentId('abcdefgh')).toBe('req-abcdefgh');
      expect(
        tableOrderDocumentId('abcdefgh').startsWith(
          TABLE_ORDER_REQUEST_ID_PREFIX,
        ),
      ).toBe(true);
    });

    it('accepts the shape a client mints', () => {
      expect(isTableOrderRequestId('abcdefgh')).toBe(true);
      expect(
        isTableOrderRequestId('3f1c9d2e-7a4b-4c8d-9e1f-2a3b4c5d6e7f'),
      ).toBe(true);
      expect(isTableOrderRequestId('a'.repeat(128))).toBe(true);
    });

    /** A slash would address a subcollection rather than name a document. */
    it('refuses anything that could not be a document name', () => {
      expect(isTableOrderRequestId('has/a/slash')).toBe(false);
      expect(isTableOrderRequestId('.leading-dot')).toBe(false);
      expect(isTableOrderRequestId('has a space')).toBe(false);
    });

    /**
     * Too short is guessable and too long is a way to store data in a document
     * id. Both are refused rather than trimmed.
     */
    it('refuses one too short or too long to be a key', () => {
      expect(isTableOrderRequestId('short')).toBe(false);
      expect(isTableOrderRequestId('a'.repeat(129))).toBe(false);
      expect(isTableOrderRequestId('')).toBe(false);
      expect(isTableOrderRequestId(undefined)).toBe(false);
    });
  });
});
