import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FloorPlanDataAccessService } from 'bite-tribe-business/floor-plan-data-access';
import {
  OrderAlertService,
  PendingSessionQueueService,
  ScanAnomalyQueueService,
  tableOrderFailure,
  TableAssistanceQueueService,
  TableOrderQueueService,
  type TableOrderFailure,
} from 'bite-tribe-business/table-management-data-access';
import type { RestaurantTable, TableOrder, TableOrderStatus } from 'model';
import { EMPTY, switchMap } from 'rxjs';
import { ToastService } from 'toast';
import { resourceFailed, resourceValue } from 'utils';
import { assistanceRows, type AssistanceRow } from './assistance-rows';
import {
  pendingSessionRows,
  scanAnomalyRows,
  type PendingSessionRow,
  type ScanAnomalyRow,
} from './scan-signal-rows';
import {
  groupOrdersByTable,
  openOrderCount,
  type OrderAction,
  type OrderTableGroup,
} from './order-queue-groups';
import { elapsedParts } from './table-status-duration';

/**
 * How often the ages on the queue are recomputed.
 *
 * Half a minute, exactly as the plan ticks and for the same reason: the numbers
 * are whole minutes, so a shorter tick re-renders the list to redraw the same
 * text and a longer one leaves a row reading `4 min` for most of its fifth.
 */
const AGE_TICK_MS = 30_000;

/** How long without a delivery before the queue calls itself out of date. */
const STALE_AFTER_MS = 60_000;

/** What the header says about the connection. Deliberately the plan's four. */
export type OrderQueueLiveStatus = 'connecting' | 'live' | 'offline' | 'stale';

/** The cancellation a staff member is part way through explaining. */
export interface PendingCancellation {
  visitId: string;
  orderId: string;
  /** The table's number, so the dialog can name what is being cancelled. */
  label: string;
}

/** The sentence a failure is reported with. */
const FAILURE_KEYS: Readonly<Record<TableOrderFailure, string>> = {
  conflict: 'order-action-conflict',
  'not-allowed': 'order-action-not-allowed',
  'not-found': 'order-action-not-found',
  'reason-required': 'order-action-reason-required',
  permission: 'order-action-permission',
  unknown: 'order-action-failed',
};

/**
 * The incoming order queue, as staff work it (GitHub issue #1105).
 *
 * ## What it is, next to the plan
 *
 * The plan answers "what is this room doing"; this answers "what does the
 * kitchen owe it". They are the same restaurant read two ways, and they are two
 * screens rather than one panel because a pass and a host stand are two places:
 * the plan is geometry read from across a room, and a ticket is a list of
 * dishes read at arm's length. What connects them is the count the plan draws
 * per table and the link in its header, so the room view stays the primary
 * screen and the queue is one press away from it.
 *
 * ## Why there is no optimistic layer
 *
 * The plan has one, and deliberately (issue #1094): a table that does not
 * change colour while a party stands in front of the host reads as a tap that
 * missed. A queue row is not that. The press is answered by the callable within
 * a round trip and by the listener a moment later, the row is under the
 * presser's finger rather than across a room, and an order that appeared to
 * move and then moved back would be a kitchen that has already started cooking.
 * So the row shows that it is busy and waits - and `busy` is per order, so one
 * slow call does not freeze the rest of the pass.
 *
 * ## Cancelling asks first
 *
 * "Cancellations are explained, not silent" is an acceptance criterion, and the
 * backend enforces it by refusing a cancellation with no reason. The dialog is
 * what stops that refusal ever being reached: the action is held here as a
 * {@link PendingCancellation} until somebody has typed a sentence, and only
 * then is anything sent.
 */
@Injectable({ providedIn: 'root' })
export class OrderQueueService {
  private readonly queue = inject(TableOrderQueueService);
  private readonly assistanceQueue = inject(TableAssistanceQueueService);
  private readonly anomalyQueue = inject(ScanAnomalyQueueService);
  private readonly pendingSessions = inject(PendingSessionQueueService);
  private readonly floorPlan = inject(FloorPlanDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly alerts = inject(OrderAlertService);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);

  readonly restaurantId = this.storeService.restaurantIdFromUrl;

  readonly tablesLoader: ResourceLoader<
    RestaurantTable[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    return restaurantId ? this.floorPlan.loadTables(restaurantId) : [];
  };

  /**
   * The tables, read for their numbers alone.
   *
   * An order carries a `tableId`, and a queue that printed one would be asking
   * a kitchen to read a generated string. Every table of the restaurant rather
   * than of one room, because a queue is not a room: a party on the terrace and
   * a party in the cellar are one pass.
   */
  readonly tables = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.tablesLoader.bind(this),
  });

  // Guarded reads: `value()` throws once a read has failed (issue #1232).
  private readonly tablesValue = resourceValue(
    this.tables,
    [] as RestaurantTable[],
  );

  /**
   * True once the table numbers could not be read.
   *
   * It does not empty the queue. The orders come from their own listener, and a
   * pass that can see the dishes and not the table numbers is worse than one
   * with both and better than one with neither - so the rows still render and
   * the header says the numbers are missing.
   */
  readonly labelsFailed = resourceFailed(this.tables);

  readonly isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  /**
   * The open orders, pushed by Firestore rather than polled.
   *
   * `undefined` until the first delivery arrives, which {@link liveStatus}
   * reports as `connecting`: an empty list drawn from no delivery at all is
   * indistinguishable from a kitchen with nothing to cook, and a pass has to be
   * able to tell those apart.
   */
  private readonly feed = toSignal(
    this.storeService.restaurantIdFromUrl$.pipe(
      switchMap((restaurantId) =>
        restaurantId ? this.queue.openOrders$(restaurantId) : EMPTY,
      ),
    ),
  );

  private readonly orders = computed<TableOrder[]>(
    () => this.feed()?.orders ?? [],
  );

  /**
   * The tables that are calling, pushed by Firestore (GitHub issue #1106).
   *
   * A listener of its own rather than a field folded into the order feed,
   * because they are two collections with two lifetimes: a table can call for
   * a waiter having ordered nothing, and an order can be cooking at a table
   * that wants nothing. One feed would have had to decide what an empty half
   * of it meant.
   */
  private readonly assistanceFeed = toSignal(
    this.storeService.restaurantIdFromUrl$.pipe(
      switchMap((restaurantId) =>
        restaurantId ? this.assistanceQueue.requests$(restaurantId) : EMPTY,
      ),
    ),
  );

  /**
   * What the restaurant is told about its codes, pushed by Firestore
   * (GitHub issue #1107).
   *
   * A third listener rather than a field on either of the two above, for the
   * reason they are two: three collections with three lifetimes. A code can be
   * hammered at a table nobody is sitting at, and a table can be calling for a
   * waiter while nothing at all is wrong with its sticker.
   */
  private readonly anomalyFeed = toSignal(
    this.storeService.restaurantIdFromUrl$.pipe(
      switchMap((restaurantId) =>
        restaurantId ? this.anomalyQueue.anomalies$(restaurantId) : EMPTY,
      ),
    ),
  );

  /**
   * The guests who have scanned and are waiting to be seated
   * (GitHub issue #1107).
   *
   * The fourth listener, and the one that is not about anything going wrong.
   * `RD-TS-1` says a scan at an unseated table raises a signal staff confirm;
   * issue #1101 wrote that signal and nothing drew it, so until this feed
   * existed the confirming was asked of a screen that did not show it.
   */
  private readonly pendingFeed = toSignal(
    this.storeService.restaurantIdFromUrl$.pipe(
      switchMap((restaurantId) =>
        restaurantId
          ? this.pendingSessions.pendingSessions$(restaurantId)
          : EMPTY,
      ),
    ),
  );

  /**
   * The wall clock, ticked so the ages on the rows advance.
   *
   * An interval rather than an animation frame, for the reason the plan gives:
   * the numbers are whole minutes, and a list redrawn sixty times a second to
   * show the same text costs a tablet its battery through a whole service.
   */
  private readonly now = signal(Date.now());

  /**
   * The language, so the ages and status words are recomputed when it changes.
   *
   * Read as a signal because `translate()` is a plain call: a computed that
   * made one would never re-run, and the queue would keep the words of whatever
   * language was active when it was opened.
   */
  private readonly language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** The queue itself: one group per table, newest first. */
  readonly groups = computed<OrderTableGroup[]>(() =>
    groupOrdersByTable(this.orders(), this.tablesValue(), this.now()),
  );

  /** How many open orders there are, across every table. */
  readonly openCount = computed(() => openOrderCount(this.groups()));

  /**
   * The tables waiting for somebody, longest first.
   *
   * Above the tickets on the screen and sorted the other way round, which is
   * the difference between a kitchen and a dining room: a ticket that just
   * arrived is the one nobody has read, and a guest who has been waving for
   * four minutes is the one nobody has answered.
   */
  readonly assistance = computed<AssistanceRow[]>(() =>
    assistanceRows(
      this.assistanceFeed()?.requests ?? [],
      this.tablesValue(),
      this.now(),
    ),
  );

  /** How many tables are calling. The badge beside the open order count. */
  readonly assistanceCount = computed(() => this.assistance().length);

  /**
   * The tables whose codes are being scanned oddly, most recently first.
   *
   * Below the two lists that are about people, because nobody is waiting on it:
   * a guest at the door and a guest with their hand up are both owed a walk
   * within the minute, and a code that was hammered is owed a decision at some
   * point this evening.
   */
  readonly anomalies = computed<ScanAnomalyRow[]>(() =>
    scanAnomalyRows(
      this.anomalyFeed()?.anomalies ?? [],
      this.tablesValue(),
      this.now(),
    ),
  );

  /** How many rows the restaurant has not read yet. */
  readonly anomalyCount = computed(() => this.anomalies().length);

  /**
   * The guests waiting to be seated, longest first, one row per table.
   *
   * Grouped by table rather than by phone: three friends who each scanned the
   * code on table 12 at the door are one party, and three rows would ask a host
   * to seat one table three times.
   */
  readonly waitingParties = computed<PendingSessionRow[]>(() =>
    pendingSessionRows(
      this.pendingFeed()?.sessions ?? [],
      this.tablesValue(),
      this.now(),
    ),
  );

  /** How many parties are waiting. The badge beside the other two counts. */
  readonly waitingCount = computed(() => this.waitingParties().length);

  readonly loading = computed(() => this.feed() === undefined);

  /** Whether this device alerts on a new order. Off until turned on. */
  readonly alertEnabled = this.alerts.enabled;

  /**
   * The order whose press has not been answered yet.
   *
   * One at a time and by id rather than a boolean over the whole queue, so a
   * slow call on table 12 leaves the rest of the pass working.
   */
  readonly busyOrderId = signal<string | undefined>(undefined);

  /**
   * The signal whose acknowledgement has not been answered yet, by row id.
   *
   * Per row for the reason `busyOrderId` is per order: a slow call about table
   * 12 must leave the rest of the floor answerable.
   */
  readonly busyAssistanceId = signal<string | undefined>(undefined);

  /**
   * The anomaly whose dismissal has not been answered yet, by row id.
   *
   * Per row for the reason the other two are: a slow call about table 12 must
   * leave the rest of the list answerable.
   */
  readonly busyAnomalyId = signal<string | undefined>(undefined);

  /** The cancellation waiting for its reason, or nothing. */
  readonly pendingCancellation = signal<PendingCancellation | undefined>(
    undefined,
  );

  /**
   * The visual half of the busy-service alert.
   *
   * A flash on the header rather than a sound, and independent of
   * {@link alertEnabled}: a kitchen loud enough to need the chime is a kitchen
   * where the chime alone is not enough, and a screen that lights up costs
   * nobody anything. It is cleared by the tick that follows it.
   */
  readonly justArrived = signal(false);

  /**
   * The four listeners' last deliveries, or `undefined` until all four have
   * arrived.
   *
   * One place rather than a pair of `Math.min` calls that have to be kept in
   * step by hand. It is what {@link liveStatus} and {@link lastUpdated} are
   * both computed from, and adding this issue's two feeds to a screen that had
   * two was exactly the change where a forgotten line would have left the
   * header promising something about listeners it had stopped watching.
   */
  private readonly deliveries = computed<
    { live: boolean; at: number }[] | undefined
  >(() => {
    const feeds = [
      this.feed(),
      this.assistanceFeed(),
      this.anomalyFeed(),
      this.pendingFeed(),
    ];

    return feeds.every((delivery) => delivery !== undefined)
      ? feeds.map((delivery) => ({
          live: delivery?.live ?? false,
          at: delivery?.at ?? 0,
        }))
      : undefined;
  });

  /**
   * Whether what is on screen is current, and if not, how far from it.
   *
   * Deliberately the plan's four states rather than two (issue #1096): a
   * listener the SDK detached and a quiet kitchen both look like an empty
   * queue, and "not current" without a number is a warning nobody can act on.
   */
  readonly liveStatus = computed<OrderQueueLiveStatus>(() => {
    const deliveries = this.deliveries();

    if (!deliveries) {
      return 'connecting';
    }

    if (deliveries.every(({ live }) => live)) {
      return 'live';
    }

    // The worst of the four, and the oldest of the four instants. The screen
    // makes one promise - what is on it is current - and it is broken by any
    // one listener going quiet, so a header reading `live` because the orders
    // are still arriving would be true about a quarter of the screen
    // (issues #1106 and #1107).
    const at = Math.min(
      ...deliveries.map(({ live, at: arrived }) =>
        live ? Number.POSITIVE_INFINITY : arrived,
      ),
    );

    return this.now() - at >= STALE_AFTER_MS ? 'stale' : 'offline';
  });

  /** How long ago the server last confirmed the queue, for the indicator. */
  readonly lastUpdated = computed<string | undefined>(() => {
    const deliveries = this.deliveries();

    if (!deliveries || deliveries.some(({ at }) => at === 0)) {
      return undefined;
    }

    // Read so the label is retranslated when the language changes.
    this.language();

    // The oldest of the four, for the reason `liveStatus` takes the worst of
    // them: "last updated" about one of four listeners is a reassurance the
    // other three have not earned.
    const { key, params } = elapsedParts(
      Math.min(...deliveries.map(({ at }) => at)),
      this.now(),
    );

    return this.transloco.translate(key, params);
  });

  constructor() {
    const tick = setInterval(() => {
      this.now.set(Date.now());
      this.justArrived.set(false);
    }, AGE_TICK_MS);

    inject(DestroyRef).onDestroy(() => clearInterval(tick));

    void this.alerts.restore();

    /*
     * A new order announces itself once (GitHub issue #1105).
     *
     * Watched by *id* rather than by count, because a count rises when an order
     * arrives and falls when one is served - and a queue that alerted on every
     * change would chime at the person who had just pressed Served. Ids that
     * were not there before are the arrivals, and nothing else is.
     *
     * The first delivery is deliberately silent: opening the screen at the
     * start of a shift would otherwise announce the whole pass at once, which
     * is a sound that says nothing about what just happened.
     */
    effect(() => {
      const delivery = this.feed();

      // Read off the *delivery* rather than off `orders()`, which answers `[]`
      // both before the listener has said anything and when the kitchen is
      // genuinely up to date. Taking the empty one as a first delivery would
      // make every order of the real first snapshot an arrival, and opening the
      // screen mid-service would announce the whole pass at once.
      if (!delivery) {
        return;
      }

      const ids = new Set(delivery.orders.map((order) => order.id));

      if (!this.seen) {
        this.seen = ids;

        return;
      }

      const arrived = [...ids].some((id) => !this.seen?.has(id));

      this.seen = ids;

      if (arrived) {
        this.alerts.alert();
        this.justArrived.set(true);
      }
    });

    /*
     * A table starting to call announces itself the same way (issue #1106).
     *
     * The same chime and the same flash as a new order, deliberately. Both
     * mean "somebody in this room is waiting on you", both are answered by
     * walking to a table, and a second sound would ask a floor to learn which
     * of two noises meant what while a service was running.
     *
     * Watched by row id for the reason the orders are watched by order id: a
     * count rises when a guest asks and falls when somebody answers, so a
     * count-watcher would chime at the person who had just pressed
     * Acknowledge. The first delivery is silent - opening the screen would
     * otherwise announce every table that was already waiting.
     */
    effect(() => {
      const delivery = this.assistanceFeed();

      if (!delivery) {
        return;
      }

      const ids = new Set(
        delivery.requests
          .filter((request) => request.status === 'open')
          .map((request) => `${request.tableId}:${request.kind}`),
      );

      if (!this.seenAssistance) {
        this.seenAssistance = ids;

        return;
      }

      const arrived = [...ids].some((id) => !this.seenAssistance?.has(id));

      this.seenAssistance = ids;

      if (arrived) {
        this.alerts.alert();
        this.justArrived.set(true);
      }
    });
  }

  /** The order ids of the previous delivery. `undefined` before the first. */
  private seen?: Set<string>;

  /** The open signal ids of the previous delivery. `undefined` before the first. */
  private seenAssistance?: Set<string>;

  /** Turns this device's alert on or off, and remembers it. */
  async toggleAlert(): Promise<void> {
    await this.alerts.setEnabled(!this.alerts.enabled());
  }

  /**
   * Acts on one order, asking for a reason first where one is needed.
   *
   * The reason check is read off the action rather than decided here, so
   * "cancelling explains itself" stays one rule in `order-queue-groups.ts`
   * rather than a condition every call site has to remember.
   */
  async pick(
    group: OrderTableGroup,
    orderId: string,
    action: OrderAction,
    status: TableOrderStatus,
  ): Promise<void> {
    const visitId = group.orders.find((order) => order.id === orderId)?.visitId;

    if (!visitId) {
      return;
    }

    if (action.needsReason) {
      this.pendingCancellation.set({ visitId, orderId, label: group.label });

      return;
    }

    await this.send(visitId, orderId, action.to, status);
  }

  /** Abandons a cancellation before a reason was given. */
  dismissCancellation(): void {
    this.pendingCancellation.set(undefined);
  }

  /**
   * Sends the cancellation the dialog collected a reason for.
   *
   * The status is read again here rather than captured when the dialog opened,
   * because the dialog is open for as long as somebody takes to type - and an
   * `expectedStatus` from a minute ago is exactly the stale expectation the
   * backend is built to refuse. Reading it now means the refusal happens only
   * when the order genuinely moved while the sentence was being written.
   */
  async confirmCancellation(reason: string): Promise<void> {
    const pending = this.pendingCancellation();

    if (!pending) {
      return;
    }

    const status = this.statusOf(pending.orderId);

    this.pendingCancellation.set(undefined);

    if (!status) {
      return;
    }

    await this.send(
      pending.visitId,
      pending.orderId,
      'cancelled',
      status,
      reason,
    );
  }

  private statusOf(orderId: string): TableOrderStatus | undefined {
    return this.orders().find((order) => order.id === orderId)?.status;
  }

  private async send(
    visitId: string,
    orderId: string,
    to: TableOrderStatus,
    expectedStatus: TableOrderStatus,
    reason?: string,
  ): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return;
    }

    this.busyOrderId.set(orderId);

    try {
      await this.queue.transition({
        restaurantId,
        visitId,
        orderId,
        status: to,
        expectedStatus,
        ...(reason ? { reason } : {}),
      });
    } catch (error) {
      // Every failure changes what is on screen, and the row is about to be
      // corrected by the listener either way - so what the staff member is
      // owed is the sentence, not a retry.
      console.error('Failed to move the order:', error);

      await this.toast.present({
        messageKey: FAILURE_KEYS[tableOrderFailure(error)],
        outcome: 'failure',
      });
    } finally {
      this.busyOrderId.set(undefined);
    }
  }

  /**
   * Tells the guest that somebody is coming, and clears the marker everywhere
   * (GitHub issue #1106).
   *
   * There is no confirmation and no reason to type, which is the whole
   * difference from cancelling an order. A cancellation takes something away
   * from a guest and owes them a sentence; an acknowledgement gives them one,
   * and a dialog in front of it would be a second tap between a member of
   * staff and a table they are already walking to.
   *
   * A second press, or somebody else's press landing first, is not an error:
   * the backend answers with what it holds, the listener removes the row, and
   * both people wanted the same thing.
   */
  async acknowledge(row: AssistanceRow): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId || this.busyAssistanceId()) {
      return;
    }

    this.busyAssistanceId.set(row.id);

    try {
      await this.assistanceQueue.acknowledge({
        restaurantId,
        tableId: row.tableId,
        kind: row.kind,
      });
    } catch (error) {
      // The row is about to be corrected by the listener either way, so what
      // the staff member is owed is the sentence rather than a retry - the
      // same judgement `send` makes about an order.
      console.error('Failed to acknowledge the request:', error);

      await this.toast.present({
        messageKey: FAILURE_KEYS[tableOrderFailure(error)],
        outcome: 'failure',
      });
    } finally {
      this.busyAssistanceId.set(undefined);
    }
  }

  /**
   * Marks one anomaly read, and clears it from every device
   * (GitHub issue #1107).
   *
   * No confirmation and nothing to type, exactly as an acknowledgement has
   * none: the press means "we have seen this", which is a statement about the
   * person pressing it rather than a change to anything a guest is owed.
   *
   * It deliberately does **not** rotate the code. The row says when rotating is
   * the answer, and that action lives on the QR sheet behind the restaurant's
   * own authority - a dismissal is read by whoever is on the floor, and
   * reprinting a sticker is not a decision a shift makes by pressing the button
   * that clears a list.
   *
   * A second press, or somebody else's press landing first, is not an error:
   * the backend answers with what it holds, the listener removes the row, and
   * both people wanted the same thing.
   */
  async dismissAnomaly(row: ScanAnomalyRow): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId || this.busyAnomalyId()) {
      return;
    }

    this.busyAnomalyId.set(row.id);

    try {
      await this.anomalyQueue.dismiss({
        restaurantId,
        tableId: row.tableId,
        kind: row.kind,
      });
    } catch (error) {
      // The row is about to be corrected by the listener either way, so what
      // the staff member is owed is the sentence rather than a retry - the same
      // judgement `send` and `acknowledge` both make.
      console.error('Failed to dismiss the signal:', error);

      await this.toast.present({
        messageKey: FAILURE_KEYS[tableOrderFailure(error)],
        outcome: 'failure',
      });
    } finally {
      this.busyAnomalyId.set(undefined);
    }
  }

  logout(): void {
    this.storeService.logout();
  }
}
