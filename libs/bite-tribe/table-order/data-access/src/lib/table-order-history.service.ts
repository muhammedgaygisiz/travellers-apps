import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  TableOrderApiService,
  TableSessionApiService,
  type LiveTableOrders,
  type LiveTableSession,
} from 'bite-tribe/api';
import { AuthService } from 'ta-firestore';
import { tableOrdersTotal } from 'model';
import type {
  TableOrder,
  TableOrderStatus,
  TableSession,
  TableSessionStatus,
} from 'model';
import { Subscription } from 'rxjs';

/**
 * The sentence each order status is told with.
 *
 * A table rather than a key built from a prefix in the template, for the reason
 * `TABLE_ORDER_BLOCKED_KEYS` is one: a status the restaurant can set and no
 * locale file covers is then a compile error here instead of a blank line
 * beside a dish somebody is waiting for.
 */
export const TABLE_ORDER_STATUS_KEYS: Readonly<
  Record<TableOrderStatus, string>
> = {
  submitted: 'table-order-status-submitted',
  accepted: 'table-order-status-accepted',
  preparing: 'table-order-status-preparing',
  served: 'table-order-status-served',
  cancelled: 'table-order-status-cancelled',
} as const;

/**
 * The sentence a session that cannot order is told with, by status.
 *
 * `active` has no entry because it has nothing to say. The other four are
 * existing strings rather than new ones: the scan screen and the refusals of
 * issue #1103 already state each of these facts in eleven locale files, and a
 * second set of four sentences meaning what four existing ones mean is four
 * more chances for two screens to tell a guest different things about one
 * table.
 */
export const TABLE_ORDER_CLOSED_KEYS: Readonly<
  Record<Exclude<TableSessionStatus, 'active'>, string>
> = {
  /** Staff have not seated the table yet. Ordering opens when they do. */
  pending: 'table-session-pending-intro',
  /** This guest left. The rest of the party is still ordering. */
  left: 'table-order-refused-sessionNotFound',
  expired: 'table-order-refused-sessionExpired',
  closed: 'table-order-refused-sessionNotActive',
} as const;

/**
 * What the guest has already ordered on this visit, and whether they may order
 * again (GitHub issue #1104).
 *
 * ## Two listeners, chained
 *
 * The phone knows the restaurant and the table it scanned, and that is all. So
 * it subscribes to its **own session document**, whose name is derived from
 * those two and the uid, and reads the visit id off it; the orders are then a
 * query under that visit. The chain is what makes the screen survive a reload
 * at a table, where it will be reloaded: nothing here is carried in router
 * state or handed over from the submission that happened before the guest put
 * their phone in their pocket.
 *
 * It is also why the session is worth a listener of its own rather than a read
 * at load. Staff closing the visit closes every session under it in the same
 * commit, so "your table has been closed" arrives on the guest's screen within
 * seconds of the host pressing the button - instead of when the guest has
 * built a second cart and had it refused.
 *
 * ## The guest sees their own orders (`RD-TS-12`)
 *
 * Not the party's. The rules admit a `list` only when it names the caller's
 * uid, so the query below is the permission as much as the filter, and the
 * total under it is one phone's - what this guest ordered, not what the table
 * owes. The bill is shared and is settled at the table (issue #1073).
 *
 * ## Nothing here writes
 *
 * An order's status is a restaurant's to move and never a guest's, and
 * `firestore.rules` refuses every client write to the collection. This service
 * reads, sums and answers one question about whether a further order is worth
 * offering; sending one stays with `TableOrderService`.
 */
@Injectable()
export class TableOrderHistoryService {
  private readonly sessionApi = inject(TableSessionApiService);
  private readonly orderApi = inject(TableOrderApiService);
  private readonly authService = inject(AuthService);

  private readonly sessionRead = signal<LiveTableSession | undefined>(
    undefined,
  );
  private readonly orderRead = signal<LiveTableOrders | undefined>(undefined);

  /** The table being watched, so a repeated call does not restart the pair. */
  private watching?: { restaurantId: string; tableId: string; uid: string };

  private sessionSubscription?: Subscription;
  private orderSubscription?: Subscription;

  /** The visit the order listener is attached to, or nothing while `pending`. */
  private watchedVisitId?: string;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** This guest's orders on this visit, newest first. */
  readonly orders = computed<TableOrder[]>(
    () => this.orderRead()?.orders ?? [],
  );

  /** Whether the guest has anything to show yet. */
  readonly hasOrders = computed(() => this.orders().length > 0);

  /**
   * What this guest has run up, cancelled orders excluded.
   *
   * Through the model's `tableOrdersTotal`, so the figure under the list and
   * the figure on each row of it are computed by one function.
   */
  readonly total = computed(() => tableOrdersTotal(this.orders()));

  /** The guest's own session, once the listener has delivered one. */
  readonly session = computed<TableSession | undefined>(
    () => this.sessionRead()?.session,
  );

  /** The status of it, or nothing where this guest has no session here. */
  readonly status = computed<TableSessionStatus | undefined>(
    () => this.session()?.status,
  );

  /**
   * Whether a further order can still be sent.
   *
   * An unknown session answers **yes**, deliberately. A guest whose listener
   * has not delivered yet, or who reached this screen by a kept link and never
   * scanned, is not somebody to stop with a sentence invented here - the
   * backend revalidates every submission and refuses it with a reason that is
   * true. What this closes is the case where the phone *knows* better: a table
   * the restaurant closed, a session that timed out, a guest who left, and the
   * `pending` table staff have not seated yet.
   */
  readonly acceptsOrders = computed(() => {
    const status = this.status();

    return status === undefined || status === 'active';
  });

  /**
   * Whether the screen may be showing a status that has since changed.
   *
   * A snapshot listener that errors is detached by the SDK rather than retried,
   * so what follows it is a status screen that has quietly stopped updating.
   * The promise this issue makes is that a change reaches the guest within
   * seconds; when it cannot be kept, the screen says so rather than showing an
   * hour-old `submitted` as though it were current.
   */
  readonly isStale = computed(() => {
    const session = this.sessionRead();
    const orders = this.orderRead();

    return session?.live === false || orders?.live === false;
  });

  /**
   * Starts watching one guest at one table, or does nothing if already there.
   *
   * Called again after a submission rather than only on load, because the first
   * call can arrive before there is a uid to watch with: the ordering screen is
   * public and the anonymous sign-in belongs to the scan before it. A second
   * call with an identity attaches what the first could not.
   */
  watch(restaurantId: string, tableId: string): void {
    const uid = this.authService.getUser()?.uid;

    if (!uid) {
      return;
    }

    if (
      this.watching?.restaurantId === restaurantId &&
      this.watching.tableId === tableId &&
      this.watching.uid === uid
    ) {
      return;
    }

    this.stop();
    this.watching = { restaurantId, tableId, uid };

    this.sessionSubscription = this.sessionApi
      .session$(restaurantId, tableId, uid)
      .subscribe((read) => {
        this.sessionRead.set(read);
        this.followVisit(restaurantId, uid, read.session?.visitId);
      });
  }

  /** Ends both listeners. The subscription owns them, so this is the removal. */
  stop(): void {
    this.sessionSubscription?.unsubscribe();
    this.orderSubscription?.unsubscribe();
    this.sessionSubscription = undefined;
    this.orderSubscription = undefined;
    this.watchedVisitId = undefined;
    this.watching = undefined;
    this.sessionRead.set(undefined);
    this.orderRead.set(undefined);
  }

  /**
   * Attaches the order listener to the visit the session names.
   *
   * A `pending` session names none, and a guest waiting to be seated has
   * ordered nothing, so there is nothing to listen to until staff open the
   * visit - at which point the session document gains the id and this runs.
   *
   * A visit id never changes under a session once it is set, so the guard is
   * about the first delivery and the ones that repeat it rather than about a
   * party being moved: moving a visit keeps its id, which is the whole reason
   * an order names the visit instead of the table.
   */
  private followVisit(
    restaurantId: string,
    uid: string,
    visitId: string | undefined,
  ): void {
    if (!visitId || visitId === this.watchedVisitId) {
      return;
    }

    this.orderSubscription?.unsubscribe();
    this.watchedVisitId = visitId;
    this.orderSubscription = this.orderApi
      .orders$(restaurantId, visitId, uid)
      .subscribe((read) => this.orderRead.set(read));
  }
}
