import { Injectable, computed, inject, signal } from '@angular/core';
import {
  TableVisitBillApiService,
  isTableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import type {
  TableVisitBill,
  TableVisitBillRefusalReason,
  TableVisitSettlementMethod,
} from 'model';

/**
 * The sentence each refusal is told with.
 *
 * A table rather than a key built from a prefix in the template, for the
 * reason `TABLE_ASSISTANCE_REFUSAL_KEYS` is one: a reason the backend can
 * return and no locale file covers is a compile error here instead of a blank
 * line in front of a guest who cannot see what they owe.
 *
 * All four are **existing** strings. A session that ended, expired or was
 * never started already has a sentence on this screen, on the order list above
 * it and on the scan screen before it, and a second set meaning what the first
 * set means is another chance for two screens to tell a guest different things
 * about one table.
 */
export const TABLE_VISIT_BILL_REFUSAL_KEYS: Readonly<
  Record<TableVisitBillRefusalReason, string>
> = {
  sessionNotFound: 'table-order-refused-sessionNotFound',
  sessionNotActive: 'table-order-refused-sessionNotActive',
  sessionExpired: 'table-order-refused-sessionExpired',
  visitClosed: 'table-order-refused-visitClosed',
} as const;

/** How each settlement method is named in front of a guest. */
export const TABLE_VISIT_SETTLEMENT_KEYS: Readonly<
  Record<TableVisitSettlementMethod, string>
> = {
  cash: 'table-bill-settled-cash',
  card: 'table-bill-settled-card',
  other: 'table-bill-settled-other',
} as const;

/**
 * What the whole table owes (GitHub issue #1110).
 *
 * ## Fetched, not watched, and not cached
 *
 * The one table surface on the guest's phone that is not a Firestore listener,
 * because `RD-TS-12` leaves no document for it to subscribe to - the party's
 * orders are unlistable from a guest's phone, which is why
 * `readTableVisitBill` exists at all.
 *
 * So the screen asks, and can ask again. What it deliberately does not do is
 * keep the answer beyond the screen: the party orders again while the bill is
 * open, and a stale total shown to somebody about to pay is worse than a
 * spinner. {@link clear} is called when the section closes.
 *
 * ## It is the table's, and it names nobody
 *
 * The guest's own orders and their own running total are
 * `TableOrderHistoryService` above this, which is `RD-TS-12`'s read and stays
 * exactly as it was. This is the other half `RD-TS-47` settled: the same
 * screen shows both, and the party's half carries no attribution - the backend
 * merges every guest's lines into one set of rows before it answers, so there
 * is nothing here to hide.
 */
@Injectable()
export class TableVisitBillService {
  private readonly api = inject(TableVisitBillApiService);

  private readonly read = signal<TableVisitBill | undefined>(undefined);
  private readonly refusal = signal<TableVisitBillRefusalReason | undefined>(
    undefined,
  );
  private readonly failure = signal<TableSessionCallFailure | undefined>(
    undefined,
  );
  private readonly loading = signal(false);

  /** The table being read, set by {@link watch} exactly as its neighbours are. */
  private watching?: { restaurantId: string; tableId: string };

  /** The bill, once one has been fetched. */
  readonly bill = computed(() => this.read());

  /** Whether a fetch is in flight, which the button shows as a spinner. */
  readonly isLoading = computed(() => this.loading());

  /** Why the last fetch was refused, if it was. */
  readonly lastRefusal = computed(() => this.refusal());

  /** Why the last fetch never reached the backend, if it did not. */
  readonly lastFailure = computed(() => this.failure());

  /**
   * Whether the table has anything on it.
   *
   * `orderCount` rather than the lines, because the two empty bills are
   * different sentences: a party that has ordered nothing is told so, and a
   * party whose only order was cancelled is not told they ordered nothing.
   */
  readonly isEmpty = computed(() => (this.read()?.orderCount ?? 0) === 0);

  /** Whether staff have recorded that the party paid. */
  readonly isSettled = computed(() => this.read()?.paymentStatus === 'settled');

  /**
   * Points the service at one table, dropping whatever the last one owed.
   *
   * The same shape as `TableOrderHistoryService.watch` and
   * `TableAssistanceService.watch`, so `TableOrderService` points all three at
   * a table in one place - but this one attaches no listener, because there is
   * no document to attach to. It records where to ask.
   */
  watch(restaurantId: string, tableId: string): void {
    if (
      this.watching?.restaurantId === restaurantId &&
      this.watching.tableId === tableId
    ) {
      return;
    }

    this.watching = { restaurantId, tableId };
    this.clear();
  }

  /**
   * Fetches what the table owes.
   *
   * Every answer clears the previous one, including the failures: a guest who
   * retried after going through a tunnel must not be shown the bill beside the
   * sentence saying it could not be fetched.
   */
  async load(): Promise<void> {
    const watching = this.watching;

    if (!watching || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.refusal.set(undefined);
    this.failure.set(undefined);

    try {
      const result = await this.api.read(
        watching.restaurantId,
        watching.tableId,
      );

      if (isTableSessionCallError(result)) {
        this.read.set(undefined);
        this.failure.set(result.failure);

        return;
      }

      if (!result.ok) {
        this.read.set(undefined);
        this.refusal.set(result.reason);

        return;
      }

      this.read.set(result.bill);
    } finally {
      this.loading.set(false);
    }
  }

  /** Drops the bill, so the next open fetches rather than shows an old total. */
  clear(): void {
    this.read.set(undefined);
    this.refusal.set(undefined);
    this.failure.set(undefined);
    this.loading.set(false);
  }
}
