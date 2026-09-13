import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  TableAssistanceApiService,
  isTableSessionCallError,
  type LiveTableAssistanceRequest,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import { TABLE_ASSISTANCE_KINDS, isTableAssistanceRaised } from 'model';
import type {
  TableAssistanceKind,
  TableAssistanceRefusalReason,
  TableAssistanceRequest,
} from 'model';
import { Subscription } from 'rxjs';

/**
 * The sentence each refusal is told with.
 *
 * A table rather than a key built from a prefix in the template, for the reason
 * `TABLE_ORDER_BLOCKED_KEYS` is one: a reason the backend can return and no
 * locale file covers is then a compile error here instead of a blank line in
 * front of a guest who cannot get a waiter and is not told why.
 *
 * Four of the six are existing strings. A session that ended, expired or was
 * never started already has a sentence on this screen and on the scan screen
 * before it, and a second set meaning what the first set means is another
 * chance for two screens to tell a guest different things about one table.
 */
export const TABLE_ASSISTANCE_REFUSAL_KEYS: Readonly<
  Record<TableAssistanceRefusalReason, string>
> = {
  sessionNotFound: 'table-order-refused-sessionNotFound',
  sessionNotActive: 'table-order-refused-sessionNotActive',
  sessionExpired: 'table-order-refused-sessionExpired',
  visitClosed: 'table-order-refused-visitClosed',
  tableNotAttended: 'table-assistance-refused-tableNotAttended',
  cooldown: 'table-assistance-refused-cooldown',
} as const;

/** What one of the two buttons is showing right now. */
export type TableAssistanceState = 'idle' | 'open' | 'acknowledged';

/** A request the restaurant declined, as the screen renders it. */
export interface TableAssistanceRefusal {
  kind: TableAssistanceKind;
  reason: TableAssistanceRefusalReason;
  /** When the guest may ask again, on `cooldown`. Epoch milliseconds. */
  retryAt?: number;
}

/** A blank pair, so the two kinds are always both present as keys. */
const emptyByKind = <TValue>(): Record<
  TableAssistanceKind,
  TValue | undefined
> => ({ callStaff: undefined, requestBill: undefined });

/**
 * The guest's end of a call for a waiter (GitHub issue #1106).
 *
 * ## Two listeners, addressed rather than searched
 *
 * One per kind, on documents whose names the phone derives from the restaurant,
 * the table and the kind. That is what makes the second half of the acceptance
 * criterion - "the guest sees that their request was received and then
 * acknowledged" - a subscription: the acknowledgement happens on a member of
 * staff's device, minutes later, and arrives here without the guest touching
 * anything.
 *
 * They attach when the ordering screen learns its table, before the guest has
 * asked for anything, and an absent document is the ordinary answer then. The
 * rules admit that read; a refusal would detach the listener and leave the
 * screen reporting itself out of date for the whole meal.
 *
 * ## The table can move under them
 *
 * A signal names the table the party is sitting at *now*, which is the visit's
 * table rather than the one on the sticker the guest scanned - so a party
 * walked to a bigger table raises its next signal against the new one. The
 * phone still holds the scanned id, so the answer's own `tableId` is what the
 * listeners are re-pointed at. Until a guest asks for something there is
 * nothing to re-point and nothing to miss.
 *
 * ## Nothing here writes Firestore
 *
 * `firestore.rules` refuses every client write to the collection: a guest able
 * to write could raise a signal at a table they are not sitting at, or clear
 * their own to get round the cooldown. Raising one is a callable and clearing
 * one is a member of staff's.
 */
@Injectable()
export class TableAssistanceService {
  private readonly api = inject(TableAssistanceApiService);

  private readonly reads =
    signal<Record<TableAssistanceKind, LiveTableAssistanceRequest | undefined>>(
      emptyByKind(),
    );

  private readonly busyKind = signal<TableAssistanceKind | undefined>(
    undefined,
  );
  private readonly refusal = signal<TableAssistanceRefusal | undefined>(
    undefined,
  );
  private readonly failure = signal<TableSessionCallFailure | undefined>(
    undefined,
  );

  private subscriptions: Subscription[] = [];

  /** What is being watched, so a repeated call does not restart the pair. */
  private watching?: { restaurantId: string; tableId: string };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** The signal of each kind at this table, as the restaurant holds it. */
  readonly requests = computed<
    Record<TableAssistanceKind, TableAssistanceRequest | undefined>
  >(() => {
    const reads = this.reads();

    return {
      callStaff: reads.callStaff?.request,
      requestBill: reads.requestBill?.request,
    };
  });

  /** Which kind has a call in flight, or nothing. */
  readonly busy = this.busyKind.asReadonly();

  /** The last refusal, until the guest asks for something else. */
  readonly lastRefusal = this.refusal.asReadonly();

  /** The last transport failure, worded differently from a refusal. */
  readonly lastFailure = this.failure.asReadonly();

  /**
   * Whether an answer may be out of date.
   *
   * A snapshot listener that errors is detached by the SDK rather than retried,
   * so what follows is a button that has quietly stopped updating. A guest
   * looking at "somebody is coming" that stopped being true is worse than one
   * told the screen is stale.
   */
  readonly isStale = computed(() =>
    TABLE_ASSISTANCE_KINDS.some((kind) => this.reads()[kind]?.live === false),
  );

  /** What the button for one kind is showing. */
  stateOf(kind: TableAssistanceKind): TableAssistanceState {
    const request = this.requests()[kind];

    if (!request) {
      return 'idle';
    }

    return request.status === 'open' ? 'open' : 'acknowledged';
  }

  /**
   * Starts watching one table, or does nothing if already there.
   *
   * Called again after a request rather than only on load, for the reason
   * `TableOrderHistoryService.watch` is: the first call can arrive before the
   * party has been walked anywhere, and the answer to a request names the table
   * the signal was actually raised against.
   */
  watch(restaurantId: string, tableId: string): void {
    if (
      this.watching?.restaurantId === restaurantId &&
      this.watching.tableId === tableId
    ) {
      return;
    }

    this.stop();
    this.watching = { restaurantId, tableId };

    this.subscriptions = TABLE_ASSISTANCE_KINDS.map((kind) =>
      this.api
        .request$(restaurantId, tableId, kind)
        .subscribe((read) =>
          this.reads.update((current) => ({ ...current, [kind]: read })),
        ),
    );
  }

  /** Ends both listeners. The subscription owns them, so this is the removal. */
  stop(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }

    this.subscriptions = [];
    this.watching = undefined;
    this.reads.set(emptyByKind());
  }

  /**
   * Asks for one, and clears whatever the last answer said.
   *
   * A second tap while a signal is open is not stopped here. The backend
   * answers it with the signal that is already up rather than raising another,
   * and a guard on this side would be a second copy of a rule that has to hold
   * across devices anyway - two guests at one table can tap at the same moment,
   * and only the derived document name settles that.
   */
  async ask(kind: TableAssistanceKind): Promise<void> {
    const watching = this.watching;

    if (!watching || this.busyKind()) {
      return;
    }

    this.busyKind.set(kind);
    this.refusal.set(undefined);
    this.failure.set(undefined);

    const result = await this.api.request(
      watching.restaurantId,
      watching.tableId,
      kind,
    );

    this.busyKind.set(undefined);

    if (isTableSessionCallError(result)) {
      this.failure.set(result.failure);

      return;
    }

    if (!isTableAssistanceRaised(result)) {
      this.refusal.set({
        kind,
        reason: result.reason,
        ...(result.retryAt === undefined ? {} : { retryAt: result.retryAt }),
      });

      return;
    }

    // The table the signal was actually raised against, which is the visit's
    // and not the sticker's. Re-pointing is a no-op for every party that has
    // not been moved, which is nearly all of them.
    this.watch(watching.restaurantId, result.request.tableId);
  }

  /** Clears the last answer, for a screen that has moved on from it. */
  dismiss(): void {
    this.refusal.set(undefined);
    this.failure.set(undefined);
  }
}
