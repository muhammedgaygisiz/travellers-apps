import {
  backfillMenuIds,
  createOrderLineSnapshot,
  findMenuItemById,
  isMenuItemAvailable,
  isMenuVariantAvailable,
  withMenuIds,
} from '../../index';
import type { Category, Menu, MenuIdFactory, MenuItem } from '../../index';

/**
 * Menu-item identity, availability and the copy an order line keeps
 * (GitHub issue #1099).
 *
 * The acceptance criteria of that issue are behavioural - a rename must not
 * move an id, a reorder must not move one, a deleted item must not damage a
 * line that pointed at it - so they are asserted here as behaviour rather than
 * as the presence of a field.
 *
 * `ts-jest` type-checks this file, so a menu item that loses its id or an order
 * line that grows a mutable field fails to compile before any expectation runs.
 */
describe('menus', () => {
  /** Deterministic ids, so a test can name the one it expects. */
  const idFactory = (prefix = 'generated'): MenuIdFactory => {
    let next = 0;

    return (): string => `${prefix}-${next++}`;
  };

  const margherita: MenuItem = {
    id: 'item-margherita',
    name: 'Margherita',
    description: 'Tomato, mozzarella, basil',
    price: 12,
    variants: [
      {
        id: 'variant-margherita-large',
        name: 'Large',
        description: '',
        price: 16,
      },
    ],
  };

  const tiramisu: MenuItem = {
    id: 'item-tiramisu',
    name: 'Tiramisu',
    description: '',
    price: 7,
  };

  const pizze: Category = {
    id: 'category-pizze',
    title: 'Pizze',
    items: [margherita],
  };

  const dolci: Category = {
    id: 'category-dolci',
    title: 'Dolci',
    items: [tiramisu],
  };

  const menu: Menu = {
    id: 'menu-china-wok',
    restaurantId: 'china-wok',
    categories: [pizze, dolci],
  };

  describe('identity', () => {
    it('keeps an item id across a rename', () => {
      const renamed: Menu = {
        ...menu,
        categories: [
          { ...pizze, items: [{ ...margherita, name: 'Pizza Margherita' }] },
          dolci,
        ],
      };

      expect(findMenuItemById(renamed, 'item-margherita')?.name).toBe(
        'Pizza Margherita',
      );
    });

    it('keeps every id across a category reorder', () => {
      const reordered: Menu = { ...menu, categories: [dolci, pizze] };

      expect(reordered.categories.map((category) => category.id)).toEqual([
        'category-dolci',
        'category-pizze',
      ]);
      expect(findMenuItemById(reordered, 'item-margherita')).toEqual(
        margherita,
      );
    });

    it('finds a variant by its own id', () => {
      expect(findMenuItemById(menu, 'variant-margherita-large')?.name).toBe(
        'Large',
      );
    });

    it('answers undefined for an item that is no longer on the menu', () => {
      expect(findMenuItemById(menu, 'item-calzone')).toBeUndefined();
      expect(findMenuItemById(undefined, 'item-margherita')).toBeUndefined();
    });
  });

  describe('backfilling ids', () => {
    /**
     * The identity check is the point rather than an optimisation: the business
     * editor runs this on every read, and a fresh object each time would
     * restart the `linkedSignal` chain the editor is built on.
     */
    it('returns the menu it was given when nothing is missing', () => {
      expect(withMenuIds(menu, idFactory())).toBe(menu);
    });

    it('leaves an existing id alone and fills only what is missing', () => {
      const legacy = {
        ...menu,
        categories: [
          {
            title: 'Pizze',
            items: [
              { name: 'Margherita', description: '', price: 12 },
              { ...tiramisu },
            ],
          },
        ],
      } as unknown as Menu;

      const {
        menu: filled,
        categories,
        items,
      } = backfillMenuIds(legacy, idFactory());

      expect(categories).toBe(1);
      expect(items).toBe(1);
      expect(filled.categories[0].id).toMatch(/^generated-/);
      expect(filled.categories[0].items[0].id).toMatch(/^generated-/);
      expect(filled.categories[0].items[0].id).not.toBe(
        filled.categories[0].id,
      );
      expect(filled.categories[0].items[1].id).toBe('item-tiramisu');
    });

    it('fills a variant whose item already has an id', () => {
      const legacy = {
        ...menu,
        categories: [
          {
            ...pizze,
            items: [
              {
                ...margherita,
                variants: [{ name: 'Large', description: '', price: 16 }],
              },
            ],
          },
        ],
      } as unknown as Menu;

      const {
        menu: filled,
        categories,
        items,
      } = backfillMenuIds(legacy, idFactory());

      expect(categories).toBe(0);
      expect(items).toBe(1);
      expect(filled.categories[0].items[0].id).toBe('item-margherita');
      expect(filled.categories[0].items[0].variants?.[0].id).toBe(
        'generated-0',
      );
      expect(filled.categories[0].id).toBe('category-pizze');
    });

    /**
     * A second run of the admin backfill must change nothing. Replacing an id
     * that already exists is the one thing this whole issue is about not doing.
     */
    it('changes nothing on a second run', () => {
      const legacy = {
        ...menu,
        categories: [{ title: 'Pizze', items: [{ ...margherita }] }],
      } as unknown as Menu;

      const once = backfillMenuIds(legacy, idFactory('first'));
      const twice = backfillMenuIds(once.menu, idFactory('second'));

      expect(twice.categories).toBe(0);
      expect(twice.items).toBe(0);
      expect(twice.menu).toBe(once.menu);
    });

    it('carries everything else through untouched', () => {
      const legacy = {
        id: 'menu-china-wok',
        restaurantId: 'china-wok',
        createdAt: '2026-01-04T10:00:00.000Z',
        categories: [
          {
            title: 'Pizze',
            subtitle: 'From the wood oven',
            items: [{ name: 'Margherita', description: 'Basil', price: 12 }],
          },
        ],
      } as unknown as Menu;

      const { menu: filled } = backfillMenuIds(legacy, idFactory());

      expect(filled.restaurantId).toBe('china-wok');
      expect(filled.createdAt).toBe('2026-01-04T10:00:00.000Z');
      expect(filled.categories[0].subtitle).toBe('From the wood oven');
      expect(filled.categories[0].items[0]).toEqual({
        id: expect.stringMatching(/^generated-/),
        name: 'Margherita',
        description: 'Basil',
        price: 12,
      });
    });
  });

  describe('availability', () => {
    it('reads an item nobody has toggled as available', () => {
      expect(isMenuItemAvailable(margherita)).toBe(true);
      expect(isMenuItemAvailable(undefined)).toBe(true);
    });

    it('reads only an explicit false as unavailable', () => {
      expect(isMenuItemAvailable({ isAvailable: false })).toBe(false);
      expect(isMenuItemAvailable({ isAvailable: true })).toBe(true);
    });

    it('takes a variant of an unavailable item off the menu with it', () => {
      expect(
        isMenuVariantAvailable({ isAvailable: false }, { isAvailable: true }),
      ).toBe(false);
    });

    it('leaves the other variants of an available item alone', () => {
      expect(
        isMenuVariantAvailable({ isAvailable: true }, { isAvailable: false }),
      ).toBe(false);
      expect(isMenuVariantAvailable(margherita, margherita.variants?.[0])).toBe(
        true,
      );
    });
  });

  describe('the copy an order line keeps', () => {
    it('records the dish, not the variant, as the item', () => {
      const line = createOrderLineSnapshot({
        item: margherita,
        variant: margherita.variants?.[0],
        quantity: 2,
        currency: 'EUR',
      });

      expect(line).toEqual({
        menuItemId: 'item-margherita',
        name: 'Margherita',
        variantId: 'variant-margherita-large',
        variantName: 'Large',
        price: 16,
        currency: 'EUR',
        quantity: 2,
      });
    });

    it('charges the dish price when no variant was ordered', () => {
      const line = createOrderLineSnapshot({
        item: margherita,
        quantity: 1,
        currency: 'EUR',
      });

      expect(line.price).toBe(12);
      expect(line.variantId).toBeUndefined();
      expect(line.variantName).toBeUndefined();
    });

    it('leaves blank notes absent rather than storing an empty string', () => {
      const blank = createOrderLineSnapshot({
        item: tiramisu,
        quantity: 1,
        currency: 'EUR',
        notes: '   ',
      });

      expect('notes' in blank).toBe(false);

      const written = createOrderLineSnapshot({
        item: tiramisu,
        quantity: 1,
        currency: 'EUR',
        notes: '  no cocoa  ',
      });

      expect(written.notes).toBe('no cocoa');
    });

    /**
     * The last acceptance criterion of issue #1099: the line renders from its
     * own copy, so deleting the dish takes the link and nothing else.
     */
    it('still reads correctly after its menu item is deleted', () => {
      const line = createOrderLineSnapshot({
        item: margherita,
        quantity: 1,
        currency: 'EUR',
      });

      const afterDeletion: Menu = { ...menu, categories: [dolci] };

      expect(findMenuItemById(afterDeletion, line.menuItemId)).toBeUndefined();
      expect(line.name).toBe('Margherita');
      expect(line.price).toBe(12);
      expect(line.currency).toBe('EUR');
    });

    /**
     * The price the guest saw is the price on the line, however the menu moves
     * afterwards. Asserted as behaviour because `readonly` is compile-time only
     * and says nothing about a menu edited underneath a submitted order.
     */
    it('does not follow a later price change on the menu', () => {
      const line = createOrderLineSnapshot({
        item: margherita,
        quantity: 1,
        currency: 'EUR',
      });

      const repriced: Menu = {
        ...menu,
        categories: [
          { ...pizze, items: [{ ...margherita, price: 14 }] },
          dolci,
        ],
      };

      expect(findMenuItemById(repriced, line.menuItemId)?.price).toBe(14);
      expect(line.price).toBe(12);
    });
  });
});
