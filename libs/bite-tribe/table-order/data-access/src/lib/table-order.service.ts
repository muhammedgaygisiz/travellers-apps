import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  BiteTribeApiService,
  TableSessionApiService,
  isTableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import {
  findMenuItemById,
  isPublicMenuResolved,
  isTableScanResolved,
} from 'model';
import type {
  Menu,
  PublicMenuRefusalReason,
  TableOrder,
  TableOrderRefusalReason,
  TableOrderRefusedItem,
  TableOrderingUnavailableReason,
  TableScanContext,
  TableScanNextStep,
  TableScanRefusalReason,
} from 'model';
import { TableAssistanceService } from './table-assistance.service';
import { TableCartService, type TableCartLine } from './table-cart.service';
import { TableOrderHistoryService } from './table-order-history.service';
import {
  TableOrderSubmissionService,
  type TableOrderOutcome,
} from './table-order-submission.service';
import type { TableOrderDelivery } from './pending-table-order';

/**
 * What a guest sees between joining a table and their order reaching the
 * kitchen (GitHub issue #1103).
 *
 * ## Why the screen resolves the token again
 *
 * It is reached from the scan screen, which already resolved it - and the two
 * screens are two navigations, so a reload, a backgrounded phone or a link the
 * guest kept would otherwise land on a page with no restaurant, no table and no
 * menu. Resolving costs no writes and is rate-limited generously (thirty
 * resolutions of one token a minute), so re-establishing the context is cheaper
 * than carrying it through router state that a reload throws away.
 *
 * It also re-asks the question that matters: the kitchen can pause between
 * joining a table and reading the menu, and a screen that took the earlier
 * answer on trust would offer an "add" button for a restaurant that has stopped
 * taking orders.
 *
 * ## Why a refusal does not replace the menu
 *
 * A submission that comes back refused is not a state the screen moves *to*. A
 * guest told their Margherita sold out needs the cart they built and the menu
 * they built it from, both still on screen, so they can take the Margherita out
 * and send the rest. So the refusal is a signal beside the ordering state, and
 * it is cleared the moment the guest changes anything - because a message about
 * a cart that no longer exists is a message about nothing.
 *
 * ## Why an unconfirmed submission is a signal too, and freezes the cart
 *
 * A send that could not be resolved sits beside the ordering state for the
 * reason a refusal does: the guest needs the cart and the menu in front of
 * them, not a screen that took both away (GitHub issue #1108).
 *
 * What it does take away is the *editing*. While a submission is unresolved the
 * cart cannot be changed, because the order it describes may already be with
 * the kitchen - and a guest who adds a dessert to a cart whose first version is
 * being cooked has built something that cannot be sent: the key already names
 * an order, so the dessert would be answered with the order that does not have
 * it in. Freezing is the honest shape - you cannot change an order you might
 * already have placed - and the way out is one tap, which either confirms it or
 * releases the cart.
 */

/** Why this screen cannot take an order at all. */
export type TableOrderBlockedReason =
  | TableScanRefusalReason
  | TableOrderingUnavailableReason
  | PublicMenuRefusalReason
  | 'menuCurrencyMissing';

/**
 * The sentence each blocked reason is told with.
 *
 * A table rather than a key built in the template, because the keys come from
 * three screens that already state these things - the scan's ten refusals, the
 * menu-only lines and the public menu's - and inventing a fourth set would be
 * fourteen more strings in eleven locale files that mean what fourteen existing
 * ones already mean.
 *
 * The one new key is the currency, which nothing had a sentence for: a menu
 * that states no currency can be read and cannot be ordered from, and that
 * distinction only exists on this screen.
 */
export const TABLE_ORDER_BLOCKED_KEYS: Readonly<
  Record<TableOrderBlockedReason, string>
> = {
  unknownToken: 'table-session-refused-unknownToken',
  restaurantNotFound: 'table-session-refused-restaurantNotFound',
  restaurantInactive: 'table-session-refused-restaurantInactive',
  tableNotFound: 'table-session-refused-tableNotFound',
  tableDisabled: 'table-session-refused-tableDisabled',
  tokenSuperseded: 'table-session-refused-tokenSuperseded',
  tokenRevoked: 'table-session-refused-tokenRevoked',
  restaurantClosed: 'table-session-refused-restaurantClosed',
  menuMissing: 'table-session-refused-menuMissing',
  menuUnavailable: 'table-session-refused-menuUnavailable',
  tableOrderingDisabled: 'table-session-menu-only-disabled',
  orderingPaused: 'table-session-menu-only-paused',
  menuEmpty: 'public-menu-refused-menuEmpty',
  menuCurrencyMissing: 'table-order-blocked-menuCurrencyMissing',
} as const;

export type TableOrderView =
  /** The token is being resolved and the menu fetched. */
  | { kind: 'loading' }
  /** Ready. The guest browses, builds a cart and sends it. */
  | {
      kind: 'ordering';
      context: TableScanContext;
      menu: Menu;
      /** The menu's currency. Never empty here - an absent one blocks. */
      currency: string;
    }
  /** Sent. The kitchen has it. */
  | {
      kind: 'placed';
      order: TableOrder;
      context: TableScanContext;
      /**
       * True when the kitchen already had it before this attempt
       * (GitHub issue #1108). A retry that found its own order is told apart
       * from a fresh send, because "sent" said twice reads as two dinners.
       */
      replayed?: boolean;
    }
  /** Nothing can be ordered here, for one of fourteen reasons. */
  | {
      kind: 'blocked';
      reason: TableOrderBlockedReason;
      /** What to do about it, where the scan had an opinion. */
      nextStep?: TableScanNextStep;
      /** Where the menu is, so the guest can still read it. */
      restaurantId: string;
    }
  /** The call never got an answer. Not a refusal, and worded differently. */
  | { kind: 'failed'; failure: TableSessionCallFailure };

/** A submission the restaurant declined, with the item it was about. */
export interface TableOrderRefusal {
  reason: TableOrderRefusalReason;
  item?: TableOrderRefusedItem;
}

/**
 * A submission the phone could not resolve (GitHub issue #1108).
 *
 * {@link TableOrderUnconfirmed.delivery} is the field that matters, and it is
 * the issue's "explicit failure state telling the guest whether the order
 * reached the restaurant". The transport failure travels beside it so the
 * screen can say what went wrong as well as what is unknown.
 */
export interface TableOrderUnconfirmed {
  delivery: TableOrderDelivery;
  failure: TableSessionCallFailure;
}

@Injectable()
export class TableOrderService {
  private readonly sessionApi = inject(TableSessionApiService);
  private readonly api = inject(BiteTribeApiService);
  private readonly route = inject(ActivatedRoute);

  /**
   * The key, the retries and the written-down submission (GitHub issue #1108).
   *
   * Injected rather than inlined, because what it owns outlives this screen: a
   * submission recorded before a reload is read back by the next instance of
   * this service, and a retry policy living in a method here would be a policy
   * with no name and nothing able to test it on its own.
   */
  private readonly submission = inject(TableOrderSubmissionService);

  readonly cart = inject(TableCartService);

  /**
   * What the guest has already ordered, and whether they may order again
   * (GitHub issue #1104).
   *
   * Injected rather than left to the screen, because {@link canSubmit} and
   * {@link submit} both have to ask it: a state machine whose transitions are
   * enforced only by which buttons are on screen is one a second entry point
   * walks straight through - the same reason the guards below exist at all.
   */
  readonly history = inject(TableOrderHistoryService);

  /**
   * The two things the guest can ask a waiter for (GitHub issue #1106).
   *
   * Injected here rather than by the screen for the reason the history is: this
   * is where the restaurant and the table are first known, and a screen that
   * had to hand them over would be a second place the pair could be started
   * from with different arguments.
   */
  readonly assistance = inject(TableAssistanceService);

  private readonly view = signal<TableOrderView>({ kind: 'loading' });
  private readonly busy = signal(false);
  private readonly refusal = signal<TableOrderRefusal | undefined>(undefined);
  private readonly unresolved = signal<TableOrderUnconfirmed | undefined>(
    undefined,
  );

  readonly state = this.view.asReadonly();
  readonly isBusy = this.busy.asReadonly();

  /**
   * The submission the phone could not resolve, while there is one
   * (GitHub issue #1108).
   *
   * Cleared only by an answer - the restaurant taking the order or declining
   * it - and never by the guest editing around it, which is the difference
   * between this and {@link lastRefusal}. A refusal is about a cart the guest
   * can fix; this is about an order that may already exist.
   */
  readonly unconfirmed = this.unresolved.asReadonly();

  /** Which attempt is running, so a long send can say it has not given up. */
  readonly attempt = this.submission.attempt;

  /**
   * Whether the cart may still be changed.
   *
   * False while a submission is unresolved. The buttons read it rather than
   * being trusted to be absent: the menu renders its own "add" and a second
   * entry point into a frozen cart is how a guest builds a round nobody can
   * send.
   */
  readonly canEditCart = computed(() => this.unresolved() === undefined);

  /**
   * The last refusal, until the guest changes something.
   *
   * Read-only from outside: the screen clears it by editing the cart, which is
   * the only thing that can make the message untrue.
   */
  readonly lastRefusal = this.refusal.asReadonly();

  /** The token from `/t/:token/order`, off the snapshot as the scan screen does. */
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  /**
   * Whether the guest may send what they have built.
   *
   * The history's answer is the live half: a table the restaurant closed while
   * the guest was reading the dessert list stops the send button within seconds
   * of the host pressing the button, instead of letting them build a cart and
   * be refused after they tap it (GitHub issue #1104).
   */
  readonly canSubmit = computed(() => {
    if (this.view().kind !== 'ordering' || this.busy()) {
      return false;
    }

    // An unresolved submission is sendable whatever the cart and the session
    // say (GitHub issue #1108). It may already be an order, and the tap is a
    // question about that order rather than a new one - so a table the
    // restaurant closed underneath the guest, or a cart the reloaded menu
    // emptied, must not be what stops them finding out what happened to their
    // dinner.
    if (this.unresolved() !== undefined) {
      return true;
    }

    return !this.cart.isEmpty() && this.history.acceptsOrders();
  });

  async load(): Promise<void> {
    if (!this.token) {
      this.blocked('unknownToken', 'askStaff', '');

      return;
    }

    this.busy.set(true);
    const scan = await this.sessionApi.resolveToken(this.token);

    if (isTableSessionCallError(scan)) {
      this.busy.set(false);
      this.view.set({ kind: 'failed', failure: scan.failure });

      return;
    }

    if (!isTableScanResolved(scan)) {
      this.busy.set(false);
      this.blocked(scan.reason, scan.nextStep, '');

      return;
    }

    const restaurantId = scan.restaurant.id;

    // Asked again rather than assumed from the screen that sent the guest here.
    // A kitchen that paused while somebody walked back to their table must not
    // be offering an "add" button.
    if (!scan.ordering.available) {
      this.busy.set(false);
      this.blocked(scan.ordering.reason, undefined, restaurantId);

      return;
    }

    const menu = await this.api.loadPublicMenu(restaurantId);
    this.busy.set(false);

    if (!menu) {
      this.view.set({ kind: 'failed', failure: 'unknown' });

      return;
    }

    if (!isPublicMenuResolved(menu)) {
      this.blocked(menu.reason, undefined, restaurantId);

      return;
    }

    const currency = menu.menu.currency ?? '';

    // A menu that states no currency can be read and cannot be ordered from: a
    // line has to record what it charged, and the only alternative to stopping
    // here is guessing a currency and printing it on a receipt.
    if (!currency) {
      this.blocked('menuCurrencyMissing', 'askStaff', restaurantId);

      return;
    }

    // Watched from here rather than from the screen, because this is where the
    // restaurant and the table are first known. A guest who reloaded the page
    // has no session id, no visit id and no order ids in hand; the table and
    // their uid are enough to find all three.
    this.history.watch(restaurantId, scan.table.id);
    this.assistance.watch(restaurantId, scan.table.id);

    const state: Extract<TableOrderView, { kind: 'ordering' }> = {
      kind: 'ordering',
      context: {
        token: scan.token,
        restaurant: scan.restaurant,
        room: scan.room,
        table: scan.table,
        menu: scan.menu,
        ordering: scan.ordering,
      },
      menu: menu.menu,
      currency,
    };

    this.view.set(state);

    // The cart the phone was holding, rebuilt against the menu that is on
    // screen now (GitHub issue #1108). After the view is set rather than
    // before, so a guest looking at a spinner is not also waiting on device
    // storage to answer.
    this.cart.useTable(restaurantId, scan.table.id);
    await this.cart.restore(menu.menu);

    await this.resolvePendingOrder(state, restaurantId, scan.table.id);
  }

  /**
   * Finds out what became of a submission a previous screen could not confirm
   * (GitHub issue #1108).
   *
   * Sending it again *is* the question. There is no separate "did it arrive"
   * call and there does not need to be: the backend answers a key it has
   * already seen with the order it wrote, so one request either reconciles the
   * phone with the truth or places the order the guest asked for and never got
   * an answer to.
   *
   * It runs without being asked, which is the reconciliation the issue wants on
   * reconnect. What bounds it is the record's own age: `restore` drops a
   * submission older than a meal rather than handing it back, so a phone that
   * finds one has a guest who is still at the table waiting for it.
   */
  private async resolvePendingOrder(
    state: Extract<TableOrderView, { kind: 'ordering' }>,
    restaurantId: string,
    tableId: string,
  ): Promise<void> {
    const pending = await this.submission.restore(restaurantId, tableId);

    if (!pending) {
      return;
    }

    // Shown before the attempt rather than after it. The guest is looking at a
    // cart they remember sending, and a screen that says nothing until the
    // round trip finishes is a screen they tap send on again.
    this.unresolved.set({ delivery: 'unknown', failure: 'offline' });
    this.busy.set(true);

    const outcome = await this.submission.resend(pending);

    this.busy.set(false);
    await this.apply(outcome, state);
  }

  /** Adding to the cart, which also clears whatever the last refusal said. */
  add(
    line: Pick<TableCartLine, 'item' | 'variant'> &
      Partial<Pick<TableCartLine, 'extras'>>,
  ): void {
    this.edit(() => this.cart.add(line.item, line.variant, line.extras ?? []));
  }

  increase(key: string): void {
    this.edit(() => this.cart.increase(key));
  }

  decrease(key: string): void {
    this.edit(() => this.cart.decrease(key));
  }

  remove(key: string): void {
    this.edit(() => this.cart.remove(key));
  }

  setNotes(key: string, notes: string): void {
    this.edit(() => this.cart.setNotes(key, notes));
  }

  /**
   * One change to the cart, and the refusal it makes untrue.
   *
   * Every edit goes through here so the freeze of {@link canEditCart} is one
   * decision rather than five. The buttons are disabled while a submission is
   * unresolved, so reaching here in that state means a second entry point - and
   * the same answer the cart service gives an impossible row: nothing.
   */
  private edit(change: () => void): void {
    if (!this.canEditCart()) {
      return;
    }

    this.refusal.set(undefined);
    change();
  }

  /**
   * Sending the cart, or sending again what could not be confirmed.
   *
   * The guard is the same shape the scan screen's `confirm` uses: a state
   * machine whose transitions are enforced only by which buttons are on screen
   * is one a second entry point walks straight through.
   *
   * A submission that is already written down is sent again under **its own
   * key** rather than as a new order (GitHub issue #1108). That is what makes
   * the retry safe: the backend either answers with the order that key already
   * names, or places it for the first time. What it never does is both.
   */
  async submit(): Promise<void> {
    const state = this.view();
    const pending = this.submission.pending();

    if (state.kind !== 'ordering' || this.busy()) {
      return;
    }

    // The session guard applies to a *new* order only. A replay is answered
    // before the session is looked at, so a guest whose table was closed while
    // their submission was in flight still gets to find out what happened.
    if (!pending && (this.cart.isEmpty() || !this.history.acceptsOrders())) {
      return;
    }

    this.busy.set(true);
    this.refusal.set(undefined);

    const outcome = pending
      ? await this.submission.resend(pending)
      : await this.submission.send({
          restaurantId: state.context.restaurant.id,
          tableId: state.context.table.id,
          currency: state.currency,
          lines: this.cart.toRequestLines(state.currency),
        });

    this.busy.set(false);

    await this.apply(outcome, state);
  }

  /**
   * What the screen becomes once a submission has an answer, or has not.
   *
   * One place rather than two, because the first send and the resend after a
   * reload reach exactly the same three outcomes and a second copy of this is
   * how a replayed order ends up announced as a fresh one on one path and not
   * the other.
   */
  private async apply(
    outcome: TableOrderOutcome,
    state: Extract<TableOrderView, { kind: 'ordering' }>,
  ): Promise<void> {
    if (outcome.outcome === 'unconfirmed') {
      this.unresolved.set({
        delivery: outcome.delivery,
        failure: outcome.failure,
      });

      return;
    }

    // The restaurant has spoken either way, so there is nothing left that might
    // be an order. The cart is released whether it was taken or declined.
    this.unresolved.set(undefined);

    if (outcome.outcome === 'refused') {
      this.refusal.set({
        reason: outcome.reason,
        ...(outcome.item ? { item: outcome.item } : {}),
      });

      // The menu the refusal is about has moved, so it is fetched again before
      // the guest looks at it. Without this they would be told the Margherita
      // is off while still reading the page that offers it.
      await this.refreshMenu(state);

      return;
    }

    this.cart.clear();

    // The first watch can have run before the guest had an identity - the
    // screen is public and the anonymous sign-in belongs to the scan before it
    // - and an order proves they have one now. A repeat call on the same table
    // and uid does nothing.
    this.history.watch(state.context.restaurant.id, state.context.table.id);

    this.view.set({
      kind: 'placed',
      order: outcome.result.order,
      context: state.context,
      ...(outcome.result.replayed ? { replayed: true } : {}),
    });
  }

  /** Ordering again, after one order has landed. */
  orderAgain(): Promise<void> {
    this.view.set({ kind: 'loading' });
    this.refusal.set(undefined);
    this.unresolved.set(undefined);

    return this.load();
  }

  /** Asking again, after a dropped connection or a block. */
  retry(): Promise<void> {
    this.view.set({ kind: 'loading' });

    return this.load();
  }

  private blocked(
    reason: TableOrderBlockedReason,
    nextStep: TableScanNextStep | undefined,
    restaurantId: string,
  ): void {
    this.view.set({
      kind: 'blocked',
      reason,
      ...(nextStep ? { nextStep } : {}),
      restaurantId,
    });
  }

  /**
   * Re-reads the menu after a refusal, and drops the cart rows it no longer
   * offers.
   *
   * Only the rows that are *gone* go. A dish that is still on the menu at a new
   * price stays in the cart at the price the guest was shown, because agreeing
   * to the new one is theirs to do - quietly updating it would be exactly the
   * silent recharging the whole price check exists to prevent.
   *
   * A menu that fails to reload leaves the screen as it was. The guest has a
   * refusal to act on either way, and replacing it with a connection error
   * would take away the sentence that told them what to fix.
   */
  private async refreshMenu(
    state: Extract<TableOrderView, { kind: 'ordering' }>,
  ): Promise<void> {
    const reloaded = await this.api.loadPublicMenu(state.context.restaurant.id);

    if (!reloaded || !isPublicMenuResolved(reloaded)) {
      return;
    }

    const menu = reloaded.menu;

    this.cart.dropMissing((line) =>
      Boolean(findMenuItemById(menu, line.variant?.id ?? line.item.id)),
    );

    this.view.set({ ...state, menu });
  }
}
