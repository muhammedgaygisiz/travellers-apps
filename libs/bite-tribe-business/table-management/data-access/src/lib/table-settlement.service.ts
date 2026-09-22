import { Injectable, computed, signal } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { TableVisitSettlementMethod } from 'model';

/** The callable that records a settlement. */
export const SETTLE_TABLE_VISIT_CALLABLE = 'settleTableVisit';

/** What the backend answers a settlement with. */
export interface TableSettlementResult {
  ok: true;
  visitId: string;
  method: TableVisitSettlementMethod;
  settledAt: number;
  settledByUserId: string;
  /** False where the visit was already settled and nothing was written. */
  changed: boolean;
}

/**
 * Staff recording that a party paid the restaurant (GitHub issue #1110).
 *
 * ## This records; it does not take money
 *
 * BiteTribe is never in the money flow at a table (`ADR-0004`, `RD-TS-45`).
 * The party paid the restaurant by card machine or at the till, and this is a
 * member of staff writing down that they did, with which of three methods.
 * There is no amount to send: an amount typed here could disagree with the
 * orders, and a second contradictory account of what the party owed is exactly
 * what `RD-TS-16` refused for cancellations.
 *
 * ## Why there is no optimistic layer and no queue
 *
 * Unlike a table transition (issue #1096), which is queued offline and
 * replayed because a host mid-rush must see a table move under their finger.
 * This is the opposite case, and `RD-TS-15` draws the line: the press happens
 * while somebody is standing at the table with a card machine in their hand,
 * the answer is one round trip, and a settlement that appeared to land and
 * then rolled back would have staff walk away from a bill nobody recorded.
 * So the button waits, and says so.
 *
 * It also needs no idempotency key. Settling has one destination, so the
 * backend answers a second press with the first one's values and
 * `changed: false` (`RD-TS-22`) - two members of staff pressing it in the same
 * second both wanted what happened.
 */
@Injectable({ providedIn: 'root' })
export class TableSettlementService {
  private readonly busyVisit = signal<string | undefined>(undefined);
  private readonly lastResult = signal<TableSettlementResult | undefined>(
    undefined,
  );
  private readonly lastError = signal<unknown>(undefined);

  /** Which visit is being settled right now, or nothing. */
  readonly busy = computed(() => this.busyVisit());

  /** The last settlement that landed, which the sheet confirms with. */
  readonly settled = computed(() => this.lastResult());

  /** Whether the last attempt failed in transport. */
  readonly failed = computed(() => this.lastError() !== undefined);

  /**
   * Records that one visit was paid.
   *
   * A second call while one is in flight does nothing: the button is disabled
   * while it waits, and this is the guard behind that rather than a second
   * copy of it - a staff member tapping twice on a slow connection must not
   * produce two calls, even though the backend would answer the second one
   * harmlessly.
   */
  async settle(
    restaurantId: string,
    visitId: string,
    method: TableVisitSettlementMethod,
  ): Promise<TableSettlementResult | undefined> {
    if (this.busyVisit()) {
      return undefined;
    }

    this.busyVisit.set(visitId);
    this.lastError.set(undefined);

    try {
      const { data } = await FirebaseFunctions.callByName<
        { restaurantId: string; visitId: string; method: string },
        TableSettlementResult
      >({
        name: SETTLE_TABLE_VISIT_CALLABLE,
        data: { restaurantId, visitId, method },
      });

      this.lastResult.set(data);

      return data;
    } catch (error) {
      this.lastError.set(error);

      return undefined;
    } finally {
      this.busyVisit.set(undefined);
    }
  }

  /** Drops the last answer, so a sheet opened again starts from nothing. */
  clear(): void {
    this.lastResult.set(undefined);
    this.lastError.set(undefined);
  }
}
