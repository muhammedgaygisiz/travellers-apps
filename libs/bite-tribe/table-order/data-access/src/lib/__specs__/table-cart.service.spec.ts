import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import type { MenuItem } from 'model';
import { TableCartService, cartLineKey } from '../table-cart.service';

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
});
