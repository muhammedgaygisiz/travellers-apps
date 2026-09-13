import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  TableSessionApiService,
  isTableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import {
  isTableScanResolved,
  isTableSessionStarted,
  type TableScanContext,
  type TableScanNextStep,
  type TableScanRefusalReason,
  type TableScanReopensAt,
} from 'model';

/**
 * What a guest sees between scanning a table code and being able to order
 * (GitHub issue #1101).
 *
 * ## Why the screen has five states and not two
 *
 * A scan is not a request that succeeds or fails. It resolves into an ordering
 * context, or into one of twelve refusals that call for three different things
 * from the guest, or into a transport failure that is none of those - and once
 * the guest confirms, into a session that is either open for ordering or
 * waiting on staff. Collapsing any of that into "error" puts somebody at a
 * table in front of a screen that says something went wrong, which is the one
 * outcome issue #1100's whole reason list exists to prevent.
 *
 * ## Why confirming is a separate step
 *
 * The acceptance criterion is that the confirmation names the restaurant and
 * the table *before* any order is possible, and the reason is that a QR code is
 * a thing anybody can point a camera at. The guest reads "you are ordering at
 * Sakura Kitchen, table 12" and agrees to it, so a sticker swapped between two
 * tables is caught by the person sitting at one of them rather than by the
 * kitchen sending food to the wrong room.
 *
 * It is also what makes the second call worth making: resolving reads and
 * writes nothing, and starting writes - so the cheap call happens on arrival
 * and the one that costs the restaurant something happens on a tap.
 */

export type TableSessionView =
  /** The token is being resolved. The first thing the guest sees. */
  | { kind: 'loading' }
  /** Resolved. The guest is asked to confirm the restaurant and table. */
  | { kind: 'confirm'; context: TableScanContext }
  /**
   * Attached. `active` means staff have the table seated and ordering is open;
   * `pending` means the restaurant has been told and has not confirmed yet.
   */
  | {
      kind: 'joined';
      status: 'pending' | 'active';
      context: TableScanContext;
    }
  /** The guest ended their own session. */
  | { kind: 'left'; context: TableScanContext }
  /** One of the twelve. */
  | {
      kind: 'refused';
      reason: TableScanRefusalReason;
      nextStep: TableScanNextStep;
      reopensAt?: TableScanReopensAt;
      pausedUntilTimestamp?: number;
    }
  /** The call never got an answer. Not a refusal, and worded differently. */
  | { kind: 'failed'; failure: TableSessionCallFailure };

/**
 * The scan context, without the discriminant the union carries it under.
 *
 * `TableScanResolved` *is* a `TableScanContext` plus `ok: true`, so handing the
 * whole thing on would put an `ok` flag inside the object the screen renders
 * the restaurant from - a field that means nothing there and would be compared
 * against the context `startTableSession` builds field by field, which has no
 * such flag. Assembled rather than spread for the same reason the backend
 * assembles it: what reaches a guest is a decision, not a leftover.
 */
const contextOf = (resolved: TableScanContext): TableScanContext => ({
  token: resolved.token,
  restaurant: resolved.restaurant,
  room: resolved.room,
  table: resolved.table,
  menu: resolved.menu,
});

@Injectable()
export class TableSessionService {
  private readonly api = inject(TableSessionApiService);
  private readonly route = inject(ActivatedRoute);

  private readonly view = signal<TableSessionView>({ kind: 'loading' });

  /** True while a call is in flight, so the confirm button cannot be double-tapped. */
  private readonly busy = signal(false);

  readonly state = this.view.asReadonly();
  readonly isBusy = this.busy.asReadonly();

  /**
   * The token from `/t/:token`.
   *
   * Read off the snapshot rather than subscribed to: the only way to reach a
   * different token is another scan, which is a fresh navigation.
   */
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  /**
   * The table context, wherever the current state has one.
   *
   * A computed rather than a second signal, so the restaurant name on screen
   * cannot survive a state that no longer has a restaurant behind it.
   */
  readonly context = computed<TableScanContext | undefined>(() => {
    const state = this.view();

    return state.kind === 'confirm' ||
      state.kind === 'joined' ||
      state.kind === 'left'
      ? state.context
      : undefined;
  });

  async resolve(): Promise<void> {
    if (!this.token) {
      this.view.set({
        kind: 'refused',
        reason: 'unknownToken',
        nextStep: 'askStaff',
      });

      return;
    }

    this.busy.set(true);
    const result = await this.api.resolveToken(this.token);
    this.busy.set(false);

    if (isTableSessionCallError(result)) {
      this.view.set({ kind: 'failed', failure: result.failure });

      return;
    }

    this.view.set(
      isTableScanResolved(result)
        ? { kind: 'confirm', context: contextOf(result) }
        : {
            kind: 'refused',
            reason: result.reason,
            nextStep: result.nextStep,
            ...(result.reopensAt ? { reopensAt: result.reopensAt } : {}),
            ...(result.pausedUntilTimestamp
              ? { pausedUntilTimestamp: result.pausedUntilTimestamp }
              : {}),
          },
    );
  }

  /**
   * The guest agreeing to the restaurant and table they were shown.
   *
   * The answer can be a refusal even though the resolution a moment ago was
   * not: the backend re-runs the twelve checks, and the kitchen can pause while
   * somebody reads a screen. The refusal replaces the confirmation rather than
   * sitting beside it, so the guest is never looking at a table name and a "we
   * are closed" at once.
   */
  async confirm(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    const result = await this.api.start(this.token);
    this.busy.set(false);

    if (isTableSessionCallError(result)) {
      this.view.set({ kind: 'failed', failure: result.failure });

      return;
    }

    if (!isTableSessionStarted(result)) {
      this.view.set({
        kind: 'refused',
        reason: result.reason,
        nextStep: result.nextStep,
        ...(result.reopensAt ? { reopensAt: result.reopensAt } : {}),
        ...(result.pausedUntilTimestamp
          ? { pausedUntilTimestamp: result.pausedUntilTimestamp }
          : {}),
      });

      return;
    }

    this.view.set({
      kind: 'joined',
      status: result.status,
      context: result.context,
    });
  }

  /**
   * Leaving, which ends this guest's session and nobody else's.
   *
   * The screen lands on `left` whatever status came back. A guest who tapped
   * leave on a session the restaurant had already closed asked to be out of it
   * and is out of it, and explaining the difference would be explaining a race
   * they cannot act on.
   */
  async leave(): Promise<void> {
    const state = this.view();

    if (state.kind !== 'joined' || this.busy()) {
      return;
    }

    this.busy.set(true);
    const result = await this.api.leave(
      state.context.restaurant.id,
      state.context.table.id,
    );
    this.busy.set(false);

    this.view.set(
      isTableSessionCallError(result)
        ? { kind: 'failed', failure: result.failure }
        : { kind: 'left', context: state.context },
    );
  }

  /** Resolving the same code again, after a refusal or after leaving. */
  retry(): Promise<void> {
    return this.resolve();
  }
}
