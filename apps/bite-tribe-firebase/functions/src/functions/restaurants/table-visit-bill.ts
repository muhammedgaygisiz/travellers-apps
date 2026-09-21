import { OrderLineExtraSnapshot, orderLineUnitPrice } from './table-order';
import type {
  TableVisitPaymentStatus,
  TableVisitSettlementMethod,
} from './table-visit';

/**
 * What the table owes, as the backend builds it (GitHub issue #1110).
 *
 * ## Why this is a second copy
 *
 * The same wall `table-visit.ts` next door describes: this project compiles
 * with its own `tsconfig.json`, whose `rootDir` is `src`, and the deploy
 * uploads `lib/` alone - so `libs/bite-tribe-common/model` is not importable
 * here. The single definition is `table-visit-bill.ts` in that library, and
 * `src/__specs__/table-visit-parity.spec.ts` compares the refusal reasons as
 * text.
 *
 * ## Why the guest is not handed a Firestore query
 *
 * `RD-TS-12` gives a guest's phone the orders **their own uid** sent, because
 * the `list` rule is satisfied by a query that names the caller - which makes
 * the `where` the permission rather than a filter. A visit-scoped read has no
 * such proof: the session document is named after the table the guest
 * *scanned* and the visit names the table the party sits at *now*, so a party
 * that moved would have the derivation miss.
 *
 * So the party's bill is a callable that checks the party test directly, and
 * `firestore.rules` is untouched. `readTableVisitBill` is its only caller.
 */

/** The extras on one line, as the order recorded them. */
export type { OrderLineExtraSnapshot };

/**
 * One row of the bill: a dish, however many of it the table ordered.
 *
 * Not an order line. An order line records one submission; a bill row is every
 * submission of the same thing, added up.
 */
export interface TableVisitBillLine {
  readonly menuItemId: string;
  readonly name: string;
  readonly variantId?: string;
  readonly variantName?: string;
  readonly notes?: string;
  readonly extras?: readonly OrderLineExtraSnapshot[];
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

/** What the table owes, and what the restaurant has recorded about it. */
export interface TableVisitBill {
  readonly restaurantId: string;
  readonly visitId: string;
  readonly tableId: string;
  readonly currency: string;
  readonly lines: readonly TableVisitBillLine[];
  readonly total: number;
  readonly paymentStatus: TableVisitPaymentStatus;
  readonly settlementMethod?: TableVisitSettlementMethod;
  readonly orderCount: number;
}

/**
 * Why a bill could not be read.
 *
 * The same four `requestTableAssistance` answers with, deliberately: a guest
 * whose session expired is told one sentence by both screens, because it is
 * one fact.
 */
export const TABLE_VISIT_BILL_REFUSAL_REASONS = [
  'sessionNotFound',
  'sessionNotActive',
  'sessionExpired',
  'visitClosed',
] as const;

export type TableVisitBillRefusalReason =
  (typeof TABLE_VISIT_BILL_REFUSAL_REASONS)[number];

export interface TableVisitBillRefused {
  readonly ok: false;
  readonly reason: TableVisitBillRefusalReason;
}

export interface TableVisitBillRead {
  readonly ok: true;
  readonly bill: TableVisitBill;
}

export type ReadTableVisitBillResult =
  TableVisitBillRead | TableVisitBillRefused;

/** One refusal, spelled once. */
export const refuseBill = (
  reason: TableVisitBillRefusalReason,
): TableVisitBillRefused => ({ ok: false, reason });

/**
 * What two lines have to agree on to be one row of the bill.
 *
 * The dish, the variant, the note, the extras **and the price**. The price is
 * the one that is easy to leave out and wrong to: a restaurant that reprices a
 * dish mid-service has sold the party two different things, and a row that
 * merged them would show one unit price that neither order was charged at.
 *
 * Extras are sorted before they are joined, so a guest who ticked cheese then
 * bacon and one who ticked bacon then cheese are one row. They ordered the
 * same pizza.
 */
const mergeKeyOf = (line: {
  menuItemId?: unknown;
  variantId?: unknown;
  name?: unknown;
  variantName?: unknown;
  notes?: unknown;
  price?: unknown;
  extras?: unknown;
}): string => {
  const extras = Array.isArray(line.extras)
    ? [...(line.extras as OrderLineExtraSnapshot[])]
        .map((extra) => `${extra.extraId}:${extra.price}`)
        .sort()
        .join(',')
    : '';

  return [
    String(line.menuItemId ?? ''),
    String(line.variantId ?? ''),
    // The rendered names are part of the key, not only the ids: a dish renamed
    // mid-service was two different things to the two guests who ordered it,
    // and each is shown what they were shown.
    String(line.name ?? ''),
    String(line.variantName ?? ''),
    String(line.notes ?? ''),
    String(line.price ?? ''),
    extras,
  ].join('|');
};

/** A stored order line, as it comes back out of Firestore. */
interface StoredLine {
  menuItemId?: unknown;
  name?: unknown;
  variantId?: unknown;
  variantName?: unknown;
  notes?: unknown;
  price?: unknown;
  quantity?: unknown;
  extras?: unknown;
}

const asPositiveNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

/**
 * Every line of every order, merged into the rows a bill is printed with.
 *
 * Order is the order the dishes were first ordered in, which is the only one
 * that means anything to the party reading it - alphabetical would scatter a
 * course, and by price would put the wine above the starters.
 *
 * A line with a quantity of zero or a price that is not a number is dropped
 * rather than rendered as a free dish. Nothing writes one: `submitTableOrder`
 * revalidates every line against the live menu before it stores it. This is
 * what keeps a document written by some future version from printing a row
 * nobody can explain at the table.
 */
export const tableVisitBillLines = (
  orders: readonly { lines?: unknown }[],
): TableVisitBillLine[] => {
  const rows = new Map<string, TableVisitBillLine>();

  for (const order of orders) {
    const lines = Array.isArray(order.lines)
      ? (order.lines as StoredLine[])
      : [];

    for (const line of lines) {
      const quantity = asPositiveNumber(line.quantity);
      const price = typeof line.price === 'number' ? line.price : undefined;

      if (quantity === 0 || price === undefined) {
        continue;
      }

      const key = mergeKeyOf(line);
      const existing = rows.get(key);

      if (existing) {
        const merged = existing.quantity + quantity;

        rows.set(key, {
          ...existing,
          quantity: merged,
          lineTotal: existing.unitPrice * merged,
        });

        continue;
      }

      const extras = Array.isArray(line.extras)
        ? (line.extras as OrderLineExtraSnapshot[])
        : undefined;
      const unitPrice = orderLineUnitPrice({ price, extras });

      rows.set(key, {
        menuItemId: String(line.menuItemId ?? ''),
        name: String(line.name ?? ''),
        ...(typeof line.variantId === 'string'
          ? { variantId: line.variantId }
          : {}),
        ...(typeof line.variantName === 'string'
          ? { variantName: line.variantName }
          : {}),
        ...(typeof line.notes === 'string' && line.notes
          ? { notes: line.notes }
          : {}),
        ...(extras && extras.length > 0 ? { extras } : {}),
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      });
    }
  }

  return [...rows.values()];
};

/**
 * What the bill comes to.
 *
 * Summed over the merged rows rather than over the orders' stored `total`
 * fields, so the figure under the list is the list added up. Two sums - one
 * over rows and one over totals - would be two chances to show a party a
 * number their own bill does not reach.
 */
export const tableVisitBillTotal = (
  lines: readonly TableVisitBillLine[],
): number => lines.reduce((sum, line) => sum + line.lineTotal, 0);
