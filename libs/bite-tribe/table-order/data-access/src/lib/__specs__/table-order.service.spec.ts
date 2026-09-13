import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  BiteTribeApiService,
  TableOrderApiService,
  TableSessionApiService,
} from 'bite-tribe/api';
import { AuthService } from 'ta-firestore';
import type { Menu, MenuItem, TableScanContext, TableSession } from 'model';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { TableCartService } from '../table-cart.service';
import { TableOrderHistoryService } from '../table-order-history.service';
import {
  TABLE_ORDER_BLOCKED_KEYS,
  TableOrderService,
} from '../table-order.service';

/**
 * What a guest sees between joining a table and their order reaching the
 * kitchen (GitHub issue #1103).
 *
 * Two claims are worth holding open here and the emulator spec cannot hold
 * either, because both are about the screen rather than the database.
 *
 * **A refusal does not replace the menu.** A guest told their Margherita sold
 * out needs the cart they built and the menu they built it from, both still on
 * screen. If a refusal ever became a state the view moves *to*, these fail.
 *
 * **The scan is re-asked.** The screen is reached from one that already
 * resolved the token, and the kitchen can pause in the walk back to the table.
 */

const MARGHERITA: MenuItem = {
  id: 'item-margherita',
  name: 'Margherita',
  description: '',
  price: 12,
};

const TIRAMISU: MenuItem = {
  id: 'item-tiramisu',
  name: 'Tiramisu',
  description: '',
  price: 6,
};

const MENU: Menu = {
  id: 'menu-1',
  currency: 'EUR',
  categories: [
    { id: 'category-1', title: 'Everything', items: [MARGHERITA, TIRAMISU] },
  ],
};

const CONTEXT: TableScanContext = {
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
  room: { id: 'room-1', name: 'Main dining room' },
  table: { id: 'table-12', label: '12', seats: 4 },
  menu: { id: 'menu-1' },
  ordering: { available: true },
};

const SESSION: TableSession = {
  id: '8_table-12_guest-alice',
  restaurantId: CONTEXT.restaurant.id,
  tableId: CONTEXT.table.id,
  guestUserId: 'guest-alice',
  status: 'active',
  visitId: 'visit-1',
  startedAt: 1_757_664_000_000,
  lastActiveAt: 1_757_664_000_000,
  isAnonymousGuest: true,
};

describe(TableOrderService.name, () => {
  let service: TableOrderService;
  let resolveToken: jest.Mock;
  let loadPublicMenu: jest.Mock;
  let submit: jest.Mock;
  let session$: BehaviorSubject<{ session?: TableSession; live: boolean }>;

  const build = (token: string | null = CONTEXT.token): TableOrderService => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TableCartService,
        TableOrderService,
        TableOrderHistoryService,
        {
          provide: TableSessionApiService,
          useValue: {
            resolveToken,
            session$: (): typeof session$ => session$,
          },
        },
        { provide: BiteTribeApiService, useValue: { loadPublicMenu } },
        {
          provide: TableOrderApiService,
          useValue: { submit, orders$: (): typeof EMPTY => EMPTY },
        },
        {
          provide: AuthService,
          useValue: {
            getUser: (): { uid: string } => ({ uid: SESSION.guestUserId }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (): string | null => token } },
          },
        },
      ],
    });

    return TestBed.inject(TableOrderService);
  };

  const ordering = async (): Promise<TableOrderService> => {
    service = build();
    await service.load();

    return service;
  };

  beforeEach(() => {
    session$ = new BehaviorSubject<{ session?: TableSession; live: boolean }>({
      session: SESSION,
      live: true,
    });
    resolveToken = jest.fn().mockResolvedValue({ ok: true, ...CONTEXT });
    loadPublicMenu = jest.fn().mockResolvedValue({
      ok: true,
      restaurant: { id: CONTEXT.restaurant.id, name: CONTEXT.restaurant.name },
      menu: MENU,
    });
    submit = jest.fn().mockResolvedValue({
      ok: true,
      order: { id: 'order-1', total: 12, lines: [] },
      tableStatus: 'ordering',
    });
  });

  describe('arriving', () => {
    it('lands on the menu with the currency it states', async () => {
      await ordering();

      expect(service.state()).toEqual({
        kind: 'ordering',
        context: CONTEXT,
        menu: MENU,
        currency: 'EUR',
      });
    });

    /**
     * The kitchen can pause between joining a table and walking back to it, so
     * the screen that offers an "add" button asks again rather than trusting
     * the answer the scan screen was drawn from.
     */
    it('blocks when ordering has been paused since the scan', async () => {
      resolveToken.mockResolvedValue({
        ok: true,
        ...CONTEXT,
        ordering: {
          available: false,
          reason: 'orderingPaused',
          pausedUntilTimestamp: 1789030900000,
        },
      });

      await ordering();

      expect(service.state()).toEqual({
        kind: 'blocked',
        reason: 'orderingPaused',
        restaurantId: CONTEXT.restaurant.id,
      });
      expect(loadPublicMenu).not.toHaveBeenCalled();
    });

    it('keeps the reason and the next step of a refused scan', async () => {
      resolveToken.mockResolvedValue({
        ok: false,
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
      });

      await ordering();

      expect(service.state()).toEqual({
        kind: 'blocked',
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
        restaurantId: '',
      });
    });

    /**
     * A menu that states no currency can be read and cannot be ordered from: a
     * line has to record what it charged, and the only alternative to stopping
     * here is guessing a currency and printing it on a receipt.
     */
    it('blocks a menu that states no currency', async () => {
      loadPublicMenu.mockResolvedValue({
        ok: true,
        restaurant: { id: CONTEXT.restaurant.id, name: 'Sakura Kitchen' },
        menu: { ...MENU, currency: undefined },
      });

      await ordering();

      expect(service.state()).toMatchObject({
        kind: 'blocked',
        reason: 'menuCurrencyMissing',
      });
    });

    it('reports a dropped connection as a failure and not a refusal', async () => {
      resolveToken.mockResolvedValue({ ok: false, failure: 'offline' });

      await ordering();

      expect(service.state()).toEqual({ kind: 'failed', failure: 'offline' });
    });

    it('blocks a route with no token at all', async () => {
      service = build(null);

      await service.load();

      expect(service.state()).toMatchObject({
        kind: 'blocked',
        reason: 'unknownToken',
        nextStep: 'askStaff',
      });
    });
  });

  describe('sending the cart', () => {
    it('sends each line at the price the screen displayed', async () => {
      await ordering();
      service.add({ item: MARGHERITA });
      service.add({ item: MARGHERITA });

      await service.submit();

      expect(submit).toHaveBeenCalledWith({
        restaurantId: CONTEXT.restaurant.id,
        tableId: CONTEXT.table.id,
        currency: 'EUR',
        lines: [{ menuItemId: MARGHERITA.id, quantity: 2, price: 12 }],
      });
    });

    it('refuses to send an empty cart', async () => {
      await ordering();

      await service.submit();

      expect(submit).not.toHaveBeenCalled();
      expect(service.canSubmit()).toBe(false);
    });

    it('empties the cart once the order lands', async () => {
      await ordering();
      service.add({ item: MARGHERITA });

      await service.submit();

      expect(service.state()).toMatchObject({ kind: 'placed' });
      expect(service.cart.isEmpty()).toBe(true);
    });
  });

  describe('an order the restaurant refused', () => {
    beforeEach(() => {
      submit.mockResolvedValue({
        ok: false,
        reason: 'itemUnavailable',
        item: { menuItemId: MARGHERITA.id, name: 'Margherita' },
      });
    });

    /**
     * The claim this whole screen is shaped around. A guest told their
     * Margherita sold out needs the cart and the menu still in front of them.
     */
    it('keeps the menu and the cart, and puts the refusal beside them', async () => {
      await ordering();
      service.add({ item: MARGHERITA });
      service.add({ item: TIRAMISU });

      await service.submit();

      expect(service.state()).toMatchObject({ kind: 'ordering' });
      expect(service.cart.lines()).toHaveLength(2);
      expect(service.lastRefusal()).toEqual({
        reason: 'itemUnavailable',
        item: { menuItemId: MARGHERITA.id, name: 'Margherita' },
      });
    });

    /**
     * A message about a cart that no longer exists is a message about nothing,
     * so the first edit clears it.
     */
    it('clears the refusal as soon as the guest changes the cart', async () => {
      await ordering();
      service.add({ item: MARGHERITA });
      await service.submit();

      service.remove(MARGHERITA.id);

      expect(service.lastRefusal()).toBeUndefined();
    });

    /**
     * The menu the refusal is about has moved, so it is fetched again - a guest
     * must not be told the Margherita is off while reading the page that offers
     * it.
     */
    it('reloads the menu and drops the rows it no longer offers', async () => {
      await ordering();
      service.add({ item: MARGHERITA });
      service.add({ item: TIRAMISU });

      loadPublicMenu.mockResolvedValue({
        ok: true,
        restaurant: { id: CONTEXT.restaurant.id, name: 'Sakura Kitchen' },
        menu: {
          ...MENU,
          categories: [
            { id: 'category-1', title: 'Everything', items: [TIRAMISU] },
          ],
        },
      });

      await service.submit();

      expect(service.cart.lines().map((line) => line.item.id)).toEqual([
        TIRAMISU.id,
      ]);
    });

    /**
     * A dish still on the menu at a new price stays in the cart at the price
     * the guest was shown. Quietly updating it would be the silent recharging
     * the whole price check exists to prevent.
     */
    it('keeps a repriced row at the price the guest agreed to', async () => {
      submit.mockResolvedValue({
        ok: false,
        reason: 'priceChanged',
        item: {
          menuItemId: MARGHERITA.id,
          name: 'Margherita',
          shownPrice: 12,
          currentPrice: 14,
        },
      });

      await ordering();
      service.add({ item: MARGHERITA });

      loadPublicMenu.mockResolvedValue({
        ok: true,
        restaurant: { id: CONTEXT.restaurant.id, name: 'Sakura Kitchen' },
        menu: {
          ...MENU,
          categories: [
            {
              id: 'category-1',
              title: 'Everything',
              items: [{ ...MARGHERITA, price: 14 }, TIRAMISU],
            },
          ],
        },
      });

      await service.submit();

      expect(service.cart.total()).toBe(12);
      expect(service.cart.toRequestLines('EUR')[0].price).toBe(12);
    });
  });

  /**
   * The live half of the send button (GitHub issue #1104).
   *
   * A guest whose table the restaurant closed while they were reading the
   * dessert list must be stopped by the screen rather than by a refusal after
   * they tap send. The session listener is what makes that arrive within
   * seconds, and the guard is on the service rather than on the button because
   * a state machine enforced only by markup is one a second entry point walks
   * straight through.
   */
  describe('a table that stops taking orders', () => {
    it('offers the send button while the session is active', async () => {
      await ordering();
      service.add({ item: MARGHERITA });

      expect(service.canSubmit()).toBe(true);
    });

    it('withdraws it the moment the visit closes', async () => {
      await ordering();
      service.add({ item: MARGHERITA });

      session$.next({ session: { ...SESSION, status: 'closed' }, live: true });

      expect(service.canSubmit()).toBe(false);
    });

    it('withdraws it while staff have not seated the table', async () => {
      await ordering();
      service.add({ item: MARGHERITA });

      session$.next({
        session: { ...SESSION, status: 'pending', visitId: undefined },
        live: true,
      });

      expect(service.canSubmit()).toBe(false);
    });

    it('sends nothing even when something calls submit anyway', async () => {
      await ordering();
      service.add({ item: MARGHERITA });
      session$.next({ session: { ...SESSION, status: 'expired' }, live: true });

      await service.submit();

      expect(submit).not.toHaveBeenCalled();
    });

    /**
     * A guest whose listener has not delivered yet, or who reached the screen
     * by a kept link and never scanned, is not somebody to stop with a sentence
     * invented here: the backend revalidates and refuses with one that is true.
     */
    it('lets an unknown session through to the backend', async () => {
      session$.next({ live: true });

      await ordering();
      service.add({ item: MARGHERITA });

      expect(service.canSubmit()).toBe(true);

      await service.submit();

      expect(submit).toHaveBeenCalled();
    });
  });

  /**
   * A reason the backend can produce and no locale file covers renders as a
   * blank line in front of a guest who cannot order and is not told why. The
   * table is the one place that cannot happen, so it is checked.
   */
  it('has a sentence for every reason that can block the screen', () => {
    expect(Object.values(TABLE_ORDER_BLOCKED_KEYS).every(Boolean)).toBe(true);
    expect(Object.keys(TABLE_ORDER_BLOCKED_KEYS)).toHaveLength(14);
  });
});
