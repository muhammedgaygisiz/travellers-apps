import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import type { Menu, MenuItem } from 'model';
import {
  TABLE_CART_KEY_PREFIX,
  TableCartService,
  cartLineKey,
} from '../table-cart.service';

/**
 * Device storage is a Capacitor plugin, so it is mocked rather than spied on.
 * What is kept is the behaviour the cart depends on - a value written comes
 * back - and the store is cleared between tests, since a cart left behind by
 * one test is exactly what the code under test looks for.
 */
const mockDeviceStorage = new Map<string, string>();

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: ({ key }: { key: string }): Promise<{ value: string | null }> =>
      Promise.resolve({ value: mockDeviceStorage.get(key) ?? null }),
    set: ({ key, value }: { key: string; value: string }): Promise<void> => {
      mockDeviceStorage.set(key, value);

      return Promise.resolve();
    },
    remove: ({ key }: { key: string }): Promise<void> => {
      mockDeviceStorage.delete(key);

      return Promise.resolve();
    },
  },
}));

/**
 * The cart a guest builds at a table (GitHub issue #1103).
 *
 * The arithmetic is the part worth testing rather than the signals. The running
 * total here and the total the backend stores on the order are the guest
 * agreeing to a figure and the restaurant recording one, and they go through
 * the same `tableOrderTotal` - so what these assert is that the *inputs* to it
 * are right: the variant's price where there is one, the quantity after a tap,
 * and no row at all for a dish nobody can serve.
 */

const MARGHERITA: MenuItem = {
  id: 'item-margherita',
  name: 'Margherita',
  description: 'Tomato and mozzarella',
  price: 12,
};

const LARGE: MenuItem = {
  id: 'variant-large',
  name: 'Large',
  description: '',
  price: 16,
};

const TIRAMISU: MenuItem = {
  id: 'item-tiramisu',
  name: 'Tiramisu',
  description: '',
  price: 6,
};

const SOLD_OUT: MenuItem = { ...TIRAMISU, isAvailable: false };

describe(TableCartService.name, () => {
  let cart: TableCartService;

  beforeEach(() => {
    mockDeviceStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), TableCartService],
    });

    cart = TestBed.inject(TableCartService);
  });

  describe('adding', () => {
    it('starts empty', () => {
      expect(cart.isEmpty()).toBe(true);
      expect(cart.total()).toBe(0);
      expect(cart.count()).toBe(0);
    });

    it('adds a dish as one row of one', () => {
      cart.add(MARGHERITA);

      expect(cart.lines()).toEqual([
        {
          key: MARGHERITA.id,
          item: MARGHERITA,
          quantity: 1,
          notes: '',
        },
      ]);
      expect(cart.total()).toBe(12);
    });

    /**
     * Tapping "add" twice means two of the same thing, which is one row of two
     * rather than two rows - and is what keeps the cart short enough to read on
     * a phone.
     */
    it('raises the quantity of a row that already exists', () => {
      cart.add(MARGHERITA);
      cart.add(MARGHERITA);

      expect(cart.lines()).toHaveLength(1);
      expect(cart.lines()[0].quantity).toBe(2);
      expect(cart.total()).toBe(24);
    });

    /**
     * A size is part of what is being ordered, so the large and the plain are
     * two rows: they cost different amounts and reach the kitchen as different
     * things.
     */
    it('keeps a variant and its dish as separate rows', () => {
      cart.add(MARGHERITA);
      cart.add(MARGHERITA, LARGE);

      expect(cart.lines().map((line) => line.key)).toEqual([
        MARGHERITA.id,
        cartLineKey(MARGHERITA, LARGE),
      ]);
      expect(cart.total()).toBe(12 + 16);
    });

    /**
     * The variant's price, never the dish's. Getting this wrong charges for the
     * small pizza and serves the large one - which is why the cart reads it
     * through the same `createOrderLineSnapshot` the order line is built with.
     */
    it('prices a variant row at the variant', () => {
      cart.add(MARGHERITA, LARGE);

      expect(cart.total()).toBe(16);
    });

    it('refuses a dish the kitchen is not serving', () => {
      cart.add(SOLD_OUT);

      expect(cart.isEmpty()).toBe(true);
    });

    /**
     * A dish with no price is refused here because nowhere else can. The type
     * requires a price and a loosely written menu omits it, the renderer draws
     * such a dish with the price line blank, and an order carrying it comes
     * back as a malformed argument - which reaches the guest as "something went
     * wrong on our side" rather than as anything they can act on.
     */
    it('refuses a dish the menu gives no price', () => {
      cart.add({ ...TIRAMISU, price: undefined as unknown as number });

      expect(cart.isEmpty()).toBe(true);
    });

    it('refuses a size the menu gives no price', () => {
      cart.add(MARGHERITA, { ...LARGE, price: undefined as unknown as number });

      expect(cart.isEmpty()).toBe(true);
    });

    /**
     * Unavailability travels down: a dish taken off the menu takes its sizes
     * with it, so a cart that accepted the large one would build an order the
     * backend refuses.
     */
    it('refuses a size of a dish that is off', () => {
      cart.add({ ...MARGHERITA, isAvailable: false }, LARGE);

      expect(cart.isEmpty()).toBe(true);
    });
  });

  describe('changing what is in it', () => {
    beforeEach(() => {
      cart.add(MARGHERITA);
      cart.add(TIRAMISU);
    });

    it('counts every unit, not every row', () => {
      cart.setQuantity(MARGHERITA.id, 3);

      expect(cart.lines()).toHaveLength(2);
      expect(cart.count()).toBe(4);
      expect(cart.total()).toBe(36 + 6);
    });

    /**
     * Zero removes rather than storing an empty row: a row of nothing is a line
     * the backend refuses and a line the guest thinks they deleted.
     */
    it('removes a row taken down to zero', () => {
      cart.decrease(MARGHERITA.id);

      expect(cart.lines().map((line) => line.key)).toEqual([TIRAMISU.id]);
    });

    it('clamps a quantity above the cap rather than refusing it', () => {
      cart.setQuantity(MARGHERITA.id, 1000);

      expect(cart.lines()[0].quantity).toBe(99);
    });

    it('removes a row outright', () => {
      cart.remove(TIRAMISU.id);

      expect(cart.lines().map((line) => line.key)).toEqual([MARGHERITA.id]);
    });

    it('keeps a note against the row it was typed on', () => {
      cart.setNotes(MARGHERITA.id, 'no basil');

      expect(cart.lines()[0].notes).toBe('no basil');
      expect(cart.lines()[1].notes).toBe('');
    });

    it('empties on clear', () => {
      cart.clear();

      expect(cart.isEmpty()).toBe(true);
      expect(cart.total()).toBe(0);
    });

    /**
     * Only the rows that are gone go. A dish still on the menu at a new price
     * stays at the price the guest was shown, because agreeing to the new one
     * is theirs to do.
     */
    it('drops only the rows a reloaded menu no longer offers', () => {
      const dropped = cart.dropMissing((line) => line.item.id !== TIRAMISU.id);

      expect(dropped).toBe(1);
      expect(cart.lines().map((line) => line.key)).toEqual([MARGHERITA.id]);
    });
  });

  describe('what it sends', () => {
    /**
     * The price on each line is what this cart has been showing, which is the
     * whole point of sending it: the backend compares it to the live menu and
     * refuses the order if it has moved.
     */
    it('sends the price it displayed, with the currency on the order', () => {
      cart.add(MARGHERITA, LARGE);
      cart.setQuantity(cartLineKey(MARGHERITA, LARGE), 2);

      expect(cart.toRequestLines('EUR')).toEqual([
        {
          menuItemId: MARGHERITA.id,
          variantId: LARGE.id,
          quantity: 2,
          price: 16,
        },
      ]);
    });

    it('trims a note and drops a blank one', () => {
      cart.add(MARGHERITA);
      cart.setNotes(MARGHERITA.id, '  no basil  ');
      cart.add(TIRAMISU);
      cart.setNotes(TIRAMISU.id, '   ');

      expect(cart.toRequestLines('EUR')).toEqual([
        {
          menuItemId: MARGHERITA.id,
          quantity: 1,
          notes: 'no basil',
          price: 12,
        },
        { menuItemId: TIRAMISU.id, quantity: 1, price: 6 },
      ]);
    });
  });

  /**
   * The cart survives a reload (GitHub issue #1108).
   *
   * Issue #1103 left this open with its reasoning intact: a cart must not cost
   * the restaurant a Firestore write per tap, and the phone's own storage costs
   * it nothing. What these hold is the part that could go wrong - a row is put
   * back together from the *live* menu, so a cart restored after the kitchen
   * changed something cannot carry a dish the guest can no longer order.
   */
  describe('a cart that survives a reload', () => {
    const RESTAURANT = 'restaurant-1';
    const TABLE = 'table-12';
    const KEY = `${TABLE_CART_KEY_PREFIX}${RESTAURANT}:${TABLE}`;

    const menuOf = (...items: MenuItem[]): Menu => ({
      id: 'menu-1',
      currency: 'EUR',
      categories: [{ id: 'category-1', title: 'Everything', items }],
    });

    const MENU = menuOf({ ...MARGHERITA, variants: [LARGE] }, TIRAMISU);

    /**
     * A second instance, as a reloaded page builds one.
     *
     * The module is reset rather than the service re-injected, because the
     * whole point is a cart that knows nothing: an instance that kept its rows
     * would restore over its own memory and prove nothing about storage.
     */
    const fresh = (): TableCartService => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), TableCartService],
      });

      return TestBed.inject(TableCartService);
    };

    /** A second cart on the same table, as a reloaded screen would build it. */
    const reloaded = (): TableCartService => {
      const next = fresh();

      next.useTable(RESTAURANT, TABLE);

      return next;
    };

    beforeEach(() => {
      cart.useTable(RESTAURANT, TABLE);
    });

    it('writes nothing until the screen names a table', async () => {
      const unnamed = fresh();

      unnamed.add(MARGHERITA);
      await Promise.resolve();

      expect(mockDeviceStorage.size).toBe(0);
    });

    it('keeps the rows, the quantities and the notes', async () => {
      cart.add(MARGHERITA);
      cart.add(MARGHERITA);
      cart.setNotes(MARGHERITA.id, 'no basil');
      await Promise.resolve();

      const next = reloaded();
      await next.restore(MENU);

      expect(next.toRequestLines('EUR')).toEqual([
        {
          menuItemId: MARGHERITA.id,
          quantity: 2,
          notes: 'no basil',
          price: 12,
        },
      ]);
    });

    it('keeps the variant a guest chose', async () => {
      cart.add({ ...MARGHERITA, variants: [LARGE] }, LARGE);
      await Promise.resolve();

      const next = reloaded();
      await next.restore(MENU);

      expect(next.toRequestLines('EUR')).toEqual([
        {
          menuItemId: MARGHERITA.id,
          variantId: LARGE.id,
          quantity: 1,
          price: 16,
        },
      ]);
    });

    /**
     * The stored row is ids, so the price comes off the menu the guest is
     * looking at now. Restoring the old number would be ordering from a copy of
     * the menu kept on the phone, which is the price problem this whole flow
     * refuses with the stale data one layer further away.
     */
    it('prices a restored row from the menu on screen now', async () => {
      cart.add(MARGHERITA);
      await Promise.resolve();

      const next = reloaded();
      await next.restore(menuOf({ ...MARGHERITA, price: 14 }, TIRAMISU));

      expect(next.total()).toBe(14);
    });

    it('drops a row the menu no longer has', async () => {
      cart.add(MARGHERITA);
      cart.add(TIRAMISU);
      await Promise.resolve();

      const next = reloaded();
      await next.restore(menuOf(TIRAMISU));

      expect(next.lines().map((line) => line.item.id)).toEqual([TIRAMISU.id]);
    });

    it('drops a row the kitchen has marked off', async () => {
      cart.add(TIRAMISU);
      await Promise.resolve();

      const next = reloaded();
      await next.restore(menuOf(SOLD_OUT));

      expect(next.isEmpty()).toBe(true);
    });

    /**
     * The restore is asynchronous and a guest can tap "add" while it is still
     * reading. A read that overwrote what they just did would lose the one row
     * they were watching.
     */
    it('leaves alone a row the guest added while it was reading', async () => {
      cart.add(MARGHERITA);
      await Promise.resolve();

      const next = reloaded();
      next.add(MARGHERITA);
      await next.restore(MENU);

      expect(next.toRequestLines('EUR')).toEqual([
        { menuItemId: MARGHERITA.id, quantity: 1, price: 12 },
      ]);
    });

    it('forgets the cart once it is empty again', async () => {
      cart.add(MARGHERITA);
      await Promise.resolve();
      cart.remove(MARGHERITA.id);
      await Promise.resolve();

      expect(mockDeviceStorage.get(KEY)).toBeUndefined();
    });

    /** A sent cart is cleared, so the next screen must not put it back. */
    it('forgets it when the order goes through', async () => {
      cart.add(MARGHERITA);
      await Promise.resolve();
      cart.clear();
      await Promise.resolve();

      const next = reloaded();
      await next.restore(MENU);

      expect(next.isEmpty()).toBe(true);
    });

    it('survives an entry it cannot read', async () => {
      mockDeviceStorage.set(KEY, 'not json at all');

      const next = reloaded();
      await next.restore(MENU);

      expect(next.isEmpty()).toBe(true);
    });
  });
});
