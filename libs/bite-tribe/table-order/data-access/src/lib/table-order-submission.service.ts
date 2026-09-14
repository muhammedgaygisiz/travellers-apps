import { Injectable, computed, inject, signal } from '@angular/core';
import { NetworkStatusService } from 'common/networkstatus';
import {
  TableOrderApiService,
  isTableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import { isTableOrderSubmitted } from 'model';
import type {
  SubmitTableOrderRequest,
  TableOrderRefusalReason,
  TableOrderRefusedItem,
  TableOrderSubmitted,
} from 'model';
import { v4 as uuid } from 'uuid';
import {
  isResumable,
  parsePendingTableOrder,
  type PendingTableOrder,
  type TableOrderDelivery,
} from './pending-table-order';
import { clearStored, readStored, writeStored } from './table-order-storage';

/** Where one table's unsent submission lives between attempts. */
export const PENDING_ORDER_KEY_PREFIX = 'table-order-pending:';

/**
 * How long the phone waits before each further attempt, in milliseconds.
 *
 * Three attempts, not more. A guest is holding the phone and watching the
 * spinner, and the fourth attempt would arrive after the point where somebody
 * decides the app is broken and waves at a waiter instead - which is the moment
 * an explicit "we could not confirm this" is worth more than another silent
 * try. The gaps grow because a restaurant's wifi comes back in seconds or not
 * for minutes, and hammering it in the first case is the same as hammering it
 * in the second.
 */
export const SUBMIT_RETRY_DELAYS_MS: readonly number[] = [600, 1800];

/** What one submission came to. */
export type TableOrderOutcome =
  /** The restaurant has it. `replayed` says whether it already did. */
  | { outcome: 'placed'; result: TableOrderSubmitted }
  /** The restaurant declined it, and the guest is owed a specific sentence. */
  | {
      outcome: 'refused';
      reason: TableOrderRefusalReason;
      item?: TableOrderRefusedItem;
    }
  /** Nothing was decided. The record is kept, and the guest is told which. */
  | {
      outcome: 'unconfirmed';
      pending: PendingTableOrder;
      delivery: TableOrderDelivery;
      failure: TableSessionCallFailure;
    };

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sending a cart over a restaurant's wifi (GitHub issue #1108).
 *
 * ## Three things have to be true at once, and only one of them is retrying
 *
 * The submission has to be **identifiable**, because a request that reached the
 * backend and whose answer was lost is indistinguishable, from here, from one
 * that never arrived. So every attempt carries the key minted when the guest
 * tapped send, and the backend answers the second attempt with what the first
 * one wrote. That is the whole of "submitting the same idempotency key twice
 * produces one order".
 *
 * The intent has to **outlive the process**, because the gap can outlast the
 * page: a phone gets locked, a tab gets dropped, a guest walks away and comes
 * back to a reloaded screen. So the record is in device storage rather than in
 * a field of this service.
 *
 * And a submission that could not be resolved has to be **shown** rather than
 * swallowed. The issue's criterion is that a guest is never left unsure whether
 * their order was placed, and the honest answer to a lost answer is to say so
 * and offer a retry that cannot double the order - which is what the key makes
 * possible.
 *
 * ## Why this is not the transition queue
 *
 * It looks like `TableTransitionQueueService` and is deliberately not a copy of
 * it. That one is a *queue*: a host acts on table after table while the signal
 * is gone, and the entries replay in order because each expects the one before
 * it to have landed. A guest has one cart and one order in flight, so a queue
 * here would be a list that never holds two things, with a replay loop, an
 * ordering rule and a per-table drop policy that no path could reach.
 *
 * What is shared is the shape of the answer, and the reasoning is on
 * `QueuedTransition`.
 *
 * ## Per table, not per account
 *
 * The key is the restaurant and the table, with no uid in it. The staff queue
 * keys by account because a tablet at the host stand is signed into by whoever
 * is on shift, and replaying the lunchtime host's seatings under the evening
 * host's name would corrupt an audit trail. A guest's phone is one guest: the
 * anonymous account it holds is the one that sent the order, and a record it
 * could not read back after a re-authentication is a record that strands the
 * submission it exists to recover.
 */
@Injectable()
export class TableOrderSubmissionService {
  private readonly orderApi = inject(TableOrderApiService);
  private readonly networkStatus = inject(NetworkStatusService);

  private readonly record = signal<PendingTableOrder | undefined>(undefined);
  private readonly sending = signal(false);
  private readonly attempts = signal(0);

  /** The submission the phone could not confirm, while there is one. */
  readonly pending = this.record.asReadonly();

  /** Whether an attempt is in flight, or waiting out a backoff between two. */
  readonly isSending = this.sending.asReadonly();

  /**
   * Which attempt is running, counting from one.
   *
   * On screen as "still trying", so a guest watching a spinner that has been
   * turning for four seconds knows the phone has not given up. A spinner with
   * nothing behind it is the thing that gets tapped a second time.
   */
  readonly attempt = this.attempts.asReadonly();

  /**
   * Whether the device believes it has a connection.
   *
   * Unknown counts as connected, following the transition queue: the status is
   * `undefined` until the first `Network.getStatus()` resolves, and treating
   * that as offline would hold the first order of every session behind a
   * reconnect that never has to happen.
   */
  readonly isOnline = computed(
    () => this.networkStatus.status()?.connected !== false,
  );

  /**
   * Reads back a submission this table left unresolved, and drops a stale one.
   *
   * Called when the ordering screen loads, which is where a reload lands. What
   * comes back is not sent by this method: deciding to resolve it is the
   * screen's, because the screen is what will show the answer.
   */
  async restore(
    restaurantId: string,
    tableId: string,
    now: number = Date.now(),
  ): Promise<PendingTableOrder | undefined> {
    const stored = await readStored(
      this.storageKey(restaurantId, tableId),
      parsePendingTableOrder,
    );

    if (!stored) {
      this.record.set(undefined);

      return undefined;
    }

    if (!isResumable(stored, now)) {
      // Older than the restaurant's own session would have survived. Dropped
      // rather than sent, because an order arriving in a dining room the guest
      // left hours ago is worse than a record nobody is watching for.
      await this.forget(stored);

      return undefined;
    }

    this.record.set(stored);

    return stored;
  }

  /**
   * Sends a cart for the first time.
   *
   * The key is minted here rather than by the caller, so there is exactly one
   * place an intent becomes identifiable and no path that sends an
   * unidentifiable one.
   */
  async send(
    request: Omit<SubmitTableOrderRequest, 'requestId'>,
    now: number = Date.now(),
  ): Promise<TableOrderOutcome> {
    const pending: PendingTableOrder = {
      requestId: uuid(),
      restaurantId: request.restaurantId,
      tableId: request.tableId,
      currency: request.currency,
      lines: request.lines,
      sentAt: now,
    };

    // Written down *before* the first attempt, and that ordering is the whole
    // guarantee. A record written afterwards would be missing for exactly the
    // request whose answer was lost - the one case it exists for.
    await writeStored(
      this.storageKey(pending.restaurantId, pending.tableId),
      pending,
    );
    this.record.set(pending);

    return this.deliver(pending);
  }

  /**
   * Sends a written-down submission again, under the key it already carries.
   *
   * The same call the guest's retry button makes and the one the screen makes
   * on its own when it finds a record after a reload. There is no separate
   * "check whether it arrived" call and there does not need to be: sending it
   * again *is* the check, because the backend answers a key it has already seen
   * with the order it wrote rather than with a second one.
   */
  resend(pending: PendingTableOrder): Promise<TableOrderOutcome> {
    this.record.set(pending);

    return this.deliver(pending);
  }

  /**
   * Forgets a submission without sending it.
   *
   * For the caller that has decided the record is resolved by something other
   * than an answer to it - a guest leaving the table, or a screen that found
   * the order in the list it is listening to.
   */
  async forget(pending: PendingTableOrder): Promise<void> {
    await clearStored(this.storageKey(pending.restaurantId, pending.tableId));

    if (this.record()?.requestId === pending.requestId) {
      this.record.set(undefined);
    }
  }

  /** Every attempt this submission gets, and what they came to. */
  private async deliver(
    pending: PendingTableOrder,
  ): Promise<TableOrderOutcome> {
    if (this.sending()) {
      // A send already running is the double tap this issue is about. The
      // button is disabled while it runs, so reaching here means a second
      // entry point - and the answer to it is the same one: nothing.
      return {
        outcome: 'unconfirmed',
        pending,
        delivery: 'unknown',
        failure: 'unknown',
      };
    }

    this.sending.set(true);

    try {
      return await this.attemptAll(pending);
    } finally {
      this.sending.set(false);
      this.attempts.set(0);
    }
  }

  private async attemptAll(
    pending: PendingTableOrder,
  ): Promise<TableOrderOutcome> {
    // Tracked across the attempts rather than asked at the end, because it is
    // what the two failure sentences are told apart by. A phone that never got
    // as far as making a call did not deliver the order and can say so; a
    // phone whose call went out and came back with nothing cannot say either
    // way, and inventing a certainty there is how a guest orders twice.
    let attempted = false;
    let failure: TableSessionCallFailure = 'offline';

    for (let attempt = 0; attempt <= SUBMIT_RETRY_DELAYS_MS.length; attempt++) {
      this.attempts.set(attempt + 1);

      // Not attempted at all when the device already knows there is nothing to
      // try. A call made with the radio off costs the guest the seconds it
      // takes to time out, and the answer at the end of them is known already.
      if (this.isOnline()) {
        attempted = true;

        const result = await this.orderApi.submit({
          restaurantId: pending.restaurantId,
          tableId: pending.tableId,
          currency: pending.currency,
          lines: pending.lines,
          requestId: pending.requestId,
        });

        if (!isTableSessionCallError(result)) {
          // An answer of any kind resolves the submission: the restaurant has
          // spoken, so there is nothing left to retry and nothing left to
          // recover. The record goes whether it was taken or declined.
          await this.forget(pending);

          return isTableOrderSubmitted(result)
            ? { outcome: 'placed', result }
            : {
                outcome: 'refused',
                reason: result.reason,
                ...(result.item ? { item: result.item } : {}),
              };
        }

        failure = result.failure;

        // The backend answered and said no more for now. Retrying a limit is
        // how a limit becomes a block, and the guest's own retry button is a
        // better clock than this loop.
        if (failure === 'rateLimited') {
          break;
        }
      }

      if (attempt < SUBMIT_RETRY_DELAYS_MS.length) {
        await delay(SUBMIT_RETRY_DELAYS_MS[attempt]);
      }
    }

    return {
      outcome: 'unconfirmed',
      pending,
      delivery: attempted ? 'unknown' : 'notSent',
      failure,
    };
  }

  private storageKey(restaurantId: string, tableId: string): string {
    return `${PENDING_ORDER_KEY_PREFIX}${restaurantId}:${tableId}`;
  }
}
