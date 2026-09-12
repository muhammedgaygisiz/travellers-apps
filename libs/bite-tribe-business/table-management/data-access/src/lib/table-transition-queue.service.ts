import { computed, inject, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { NetworkStatusService } from 'common/networkstatus';
import { Subject } from 'rxjs';
import { AuthService } from 'ta-firestore';
import { v4 as uuid } from 'uuid';
import {
  TableStateDataAccessService,
  TableTransitionRequest,
  TableTransitionResult,
} from './table-state-data-access.service';
import {
  tableTransitionFailure,
  TableTransitionFailure,
} from './table-transition-failure';
import {
  parseQueue,
  QueuedTransition,
  TransitionOutcome,
  UnappliedTransition,
  withoutTable,
} from './table-transition-queue';

/** Where the unsent transitions of one account live between attempts. */
export const TRANSITION_QUEUE_KEY_PREFIX = 'table-transition-queue:';

/** One attempt at sending a transition, without any queue side effect. */
type Attempt =
  | { kind: 'applied'; result: TableTransitionResult }
  | { kind: 'refused'; failure: TableTransitionFailure; error: unknown };

/**
 * The transitions the staff view has asked for and not yet had accepted
 * (GitHub issue #1096).
 *
 * ## Why this is not just a retry
 *
 * Three things have to be true at once for a staff view to survive a basement
 * dining room, and only one of them is retrying.
 *
 * The ask has to **outlive the process**, because the gap can be the length of
 * a service and a tablet gets locked, backgrounded and reloaded inside it. So
 * the queue is in device storage rather than in a promise.
 *
 * The retry must not **apply twice**. A request that reached the backend and
 * whose answer was lost is indistinguishable, from here, from one that never
 * arrived - so every attempt carries the key minted when the intent was
 * recorded, and the backend answers the second attempt with what the first one
 * wrote. That is the whole of "seating two tables offline produces exactly two
 * transitions, not four".
 *
 * And a replay that **no longer applies** has to be shown rather than forced.
 * Every entry carries the status the device was showing when the host acted,
 * and the backend compares it inside its transaction; a table somebody else
 * moved in the meantime refuses the replay, and the refusal reaches the host
 * instead of being swallowed or overwritten.
 *
 * ## Order, and why it is one at a time
 *
 * The queue replays in the order it was made, one entry at a time. A host who
 * seated table 12 and then marked it ordering queued two transitions whose
 * second expects the first to have landed, and sending them together would
 * make the second's outcome depend on which request the backend happened to
 * see first. The end-of-service reset of issue #1094 sends its tables in
 * parallel for the opposite reason: those are independent tables, and each is
 * its own transaction on its own document.
 *
 * ## Why the network state comes from `libs/common`
 *
 * `NetworkStatusService` is the one connectivity mechanism in this workspace,
 * and the issue is explicit that this feature reuses it rather than adding a
 * second. It is fed by the `@capacitor/network` listener the app shell
 * registers, and it is what lets an offline transition be written down without
 * a round trip that was never going to arrive.
 */
@Injectable({ providedIn: 'root' })
export class TableTransitionQueueService {
  private readonly tableStates = inject(TableStateDataAccessService);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly authService = inject(AuthService);

  private readonly queue = signal<readonly QueuedTransition[]>([]);

  /** Everything asked for and not yet accepted, oldest first. */
  readonly pending = this.queue.asReadonly();

  private readonly appliedSubject = new Subject<TableTransitionResult>();

  /**
   * Each transition as the backend accepts it, announced the instant it lands.
   *
   * A stream rather than a signal the caller polls, because the moment matters:
   * the staff view is drawing the table optimistically off the queue entry, and
   * it has to be holding a confirmed guess *before* the entry leaves the queue.
   * A gap between the two is a table that flicks back to its old status for a
   * frame, which is the flicker the whole optimistic layer exists to avoid.
   */
  readonly applied$ = this.appliedSubject.asObservable();

  /**
   * Whether the device believes it has a connection.
   *
   * Unknown counts as connected. The status is `undefined` until the first
   * `Network.getStatus()` resolves, and treating that as offline would queue
   * the first transition of every session behind a reconnect that never has to
   * happen.
   */
  readonly isOnline = computed(
    () => this.networkStatus.status()?.connected !== false,
  );

  /** How many transitions are waiting, for the indicator in the header. */
  readonly pendingCount = computed(() => this.queue().length);

  private restoring: Promise<readonly QueuedTransition[]> | undefined;
  private replaying = false;

  /**
   * Reads back what the last session left unsent.
   *
   * Safe to call repeatedly: only the first call touches storage, so the page
   * can ask on every open without a read per navigation. It is deliberately not
   * done in the constructor - this service is `providedIn: 'root'` and would
   * otherwise hit device storage in every app that pulls the library in,
   * including in tests that never open a table plan.
   */
  async restore(): Promise<readonly QueuedTransition[]> {
    // The promise is what is remembered, not a flag. A flag set before the
    // read resolves lets a transition made in the same tick be written into an
    // empty queue and then overwritten by what came back from storage - the
    // one transition lost would be the one made first.
    this.restoring ??= this.read();

    return this.restoring;
  }

  private async read(): Promise<readonly QueuedTransition[]> {
    const key = this.storageKey();

    if (!key) {
      return this.queue();
    }

    try {
      const { value } = await Preferences.get({ key });

      this.queue.set([...parseQueue(value), ...this.queue()]);
    } catch (error) {
      // A queue that cannot be read is an empty queue, not a broken page. The
      // transitions in it are lost, which is why the failure is reported
      // rather than swallowed.
      console.warn('Failed to read the queued table transitions:', error);
    }

    return this.queue();
  }

  /**
   * Sends one transition, or writes it down to be sent when the signal is back.
   *
   * The key is minted here rather than by the caller, so there is exactly one
   * place an intent becomes identifiable and no path that sends an
   * unidentifiable one.
   */
  async submit(
    request: Omit<TableTransitionRequest, 'requestId'>,
  ): Promise<TransitionOutcome> {
    await this.restore();

    const entry: QueuedTransition = {
      requestId: uuid(),
      restaurantId: request.restaurantId,
      tableId: request.tableId,
      status: request.status,
      expectedStatus: request.expectedStatus,
      ...(request.reason === undefined ? {} : { reason: request.reason }),
      queuedAt: Date.now(),
    };

    // Queued without trying, when the device already knows there is nothing to
    // try. A call made with the radio off costs the host the seconds it takes
    // to time out, and the answer at the end of them is the one already known.
    if (!this.isOnline()) {
      await this.enqueue(entry);

      return { outcome: 'queued', entry };
    }

    const attempt = await this.attempt(entry);

    if (attempt.kind === 'applied') {
      return { outcome: 'applied', result: attempt.result };
    }

    // A connection that dropped between the check above and the call itself.
    if (attempt.failure === 'offline') {
      await this.enqueue(entry);

      return { outcome: 'queued', entry };
    }

    return {
      outcome: 'rejected',
      failure: attempt.failure,
      error: attempt.error,
    };
  }

  /**
   * Sends what is waiting, oldest first, and answers with what would not go.
   *
   * Stops at the first entry that could not be *delivered*, leaving it and
   * everything behind it queued: the signal that came back for one request is
   * not a signal that stayed. A refusal is different - the backend has spoken,
   * and re-sending would only collect the same answer - so the entry is
   * dropped, reported, and the queue moves on to the next table.
   *
   * Re-entrant calls are ignored. The reconnect that triggers a replay can
   * arrive more than once for one reconnection, and two replays of one queue
   * would send every entry twice - which the idempotency key would absorb, but
   * at the cost of a round trip per entry and an audit trail nobody asked for.
   */
  async replay(): Promise<UnappliedTransition[]> {
    await this.restore();

    if (this.replaying || this.queue().length === 0 || !this.isOnline()) {
      return [];
    }

    this.replaying = true;

    const unapplied: UnappliedTransition[] = [];

    try {
      // Re-read the queue on every pass rather than iterating a snapshot of
      // it: a staff member goes on acting on tables while the replay runs, and
      // what they add belongs behind what is already there.
      for (let entry = this.queue()[0]; entry; entry = this.queue()[0]) {
        const attempt = await this.attempt(entry);

        if (attempt.kind === 'applied') {
          // Announced before the entry is dropped, so the view is holding a
          // confirmed guess by the time it stops holding a queued one.
          this.appliedSubject.next(attempt.result);
          await this.dequeue(entry.requestId);

          continue;
        }

        if (attempt.failure === 'offline' || attempt.failure === 'permission') {
          // Nothing was decided, so nothing is dropped. A signed-out session is
          // the same shape of problem as a lost one: the transitions are still
          // valid and the device simply cannot deliver them yet.
          break;
        }

        unapplied.push(
          ...(await this.dropTable(entry.tableId, attempt.failure)),
        );
      }
    } finally {
      this.replaying = false;
    }

    return unapplied;
  }

  /** One send, with no queue side effect of its own. */
  private async attempt(entry: QueuedTransition): Promise<Attempt> {
    try {
      const result = await this.tableStates.transition({
        restaurantId: entry.restaurantId,
        tableId: entry.tableId,
        status: entry.status,
        expectedStatus: entry.expectedStatus,
        requestId: entry.requestId,
        ...(entry.reason === undefined ? {} : { reason: entry.reason }),
      });

      return { kind: 'applied', result };
    } catch (error) {
      return { kind: 'refused', failure: tableTransitionFailure(error), error };
    }
  }

  /** Drops a refused table's whole chain, and says what was in it. */
  private async dropTable(
    tableId: string,
    failure: TableTransitionFailure,
  ): Promise<UnappliedTransition[]> {
    const { kept, dropped } = withoutTable(this.queue(), tableId);

    await this.store(kept);

    return dropped.map((entry) => ({ entry, failure }));
  }

  private async enqueue(entry: QueuedTransition): Promise<void> {
    await this.store([...this.queue(), entry]);
  }

  private async dequeue(requestId: string): Promise<void> {
    await this.store(
      this.queue().filter((entry) => entry.requestId !== requestId),
    );
  }

  /**
   * The queue, in memory and on the device.
   *
   * The signal is written first and unconditionally. A device whose storage is
   * full or unavailable still has a staff member in front of it who has just
   * seated a table, and the transition they made is worth keeping for this
   * session even if it cannot be kept for the next one.
   */
  private async store(next: readonly QueuedTransition[]): Promise<void> {
    this.queue.set(next);

    const key = this.storageKey();

    if (!key) {
      return;
    }

    try {
      if (next.length === 0) {
        await Preferences.remove({ key });

        return;
      }

      await Preferences.set({ key, value: JSON.stringify(next) });
    } catch (error) {
      console.warn('Failed to persist the queued table transitions:', error);
    }
  }

  /**
   * Per account, not per device.
   *
   * A tablet at the host stand is signed into by whoever is on shift, and the
   * backend records the transition against the account that finally sends it.
   * A queue shared across accounts would let the evening host replay the
   * lunchtime host's seatings under their own name, into an audit trail whose
   * whole purpose is answering who moved a disputed table.
   */
  private storageKey(): string | null {
    const uid = this.authService.getUser()?.uid;

    return uid ? `${TRANSITION_QUEUE_KEY_PREFIX}${uid}` : null;
  }
}
