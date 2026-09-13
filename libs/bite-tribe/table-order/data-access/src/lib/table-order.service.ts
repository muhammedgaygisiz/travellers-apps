import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  BiteTribeApiService,
  TableOrderApiService,
  TableSessionApiService,
  isTableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import {
  findMenuItemById,
  isPublicMenuResolved,
  isTableOrderSubmitted,
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
import { TableCartService, type TableCartLine } from './table-cart.service';

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
  | { kind: 'placed'; order: TableOrder; context: TableScanContext }
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

@Injectable()
export class TableOrderService {
  private readonly sessionApi = inject(TableSessionApiService);
  private readonly orderApi = inject(TableOrderApiService);
  private readonly api = inject(BiteTribeApiService);
  private readonly route = inject(ActivatedRoute);

  readonly cart = inject(TableCartService);

  private readonly view = signal<TableOrderView>({ kind: 'loading' });
  private readonly busy = signal(false);
  private readonly refusal = signal<TableOrderRefusal | undefined>(undefined);

  readonly state = this.view.asReadonly();
  readonly isBusy = this.busy.asReadonly();

  /**
   * The last refusal, until the guest changes something.
   *
   * Read-only from outside: the screen clears it by editing the cart, which is
   * the only thing that can make the message untrue.
   */
  readonly lastRefusal = this.refusal.asReadonly();

  /** The token from `/t/:token/order`, off the snapshot as the scan screen does. */
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  /** Whether the guest may send what they have built. */
  readonly canSubmit = computed(
    () =>
      this.view().kind === 'ordering' && !this.cart.isEmpty() && !this.busy(),
  );

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

    this.view.set({
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
    });
  }

  /** Adding to the cart, which also clears whatever the last refusal said. */
  add(line: Pick<TableCartLine, 'item' | 'variant'>): void {
    this.refusal.set(undefined);
    this.cart.add(line.item, line.variant);
  }

  increase(key: string): void {
    this.refusal.set(undefined);
    this.cart.increase(key);
  }

  decrease(key: string): void {
    this.refusal.set(undefined);
    this.cart.decrease(key);
  }

  remove(key: string): void {
    this.refusal.set(undefined);
    this.cart.remove(key);
  }

  setNotes(key: string, notes: string): void {
    this.refusal.set(undefined);
    this.cart.setNotes(key, notes);
  }

  /**
   * Sending the cart.
   *
   * The guard is the same shape the scan screen's `confirm` uses: a state
   * machine whose transitions are enforced only by which buttons are on screen
   * is one a second entry point walks straight through.
   */
  async submit(): Promise<void> {
    const state = this.view();

    if (state.kind !== 'ordering' || this.cart.isEmpty() || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.refusal.set(undefined);

    const result = await this.orderApi.submit({
      restaurantId: state.context.restaurant.id,
      tableId: state.context.table.id,
      currency: state.currency,
      lines: this.cart.toRequestLines(state.currency),
    });

    this.busy.set(false);

    if (isTableSessionCallError(result)) {
      this.view.set({ kind: 'failed', failure: result.failure });

      return;
    }

    if (!isTableOrderSubmitted(result)) {
      this.refusal.set({
        reason: result.reason,
        ...(result.item ? { item: result.item } : {}),
      });

      // The menu the refusal is about has moved, so it is fetched again before
      // the guest looks at it. Without this they would be told the Margherita
      // is off while still reading the page that offers it.
      await this.refreshMenu(state);

      return;
    }

    this.cart.clear();
    this.view.set({
      kind: 'placed',
      order: result.order,
      context: state.context,
    });
  }

  /** Ordering again, after one order has landed. */
  orderAgain(): Promise<void> {
    this.view.set({ kind: 'loading' });
    this.refusal.set(undefined);

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
