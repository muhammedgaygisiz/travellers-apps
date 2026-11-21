import type { Menu, MenuItem } from 'model';
import {
  editableDish,
  moveCategory,
  moveDish,
  priceLabel,
  removeCategory,
  removeDish,
  saveCategoryDetails,
  saveDish,
  saveExtras,
  setAvailability,
} from '../menu-edits';

jest.mock('utils', () => ({ createEntityId: (): string => 'new-id' }));

const dish = (over: Partial<MenuItem> = {}): MenuItem => ({
  id: 'd1',
  name: 'Pad Thai',
  description: 'Rice noodles',
  price: 0,
  ...over,
});

const MENU: Menu = {
  id: 'm1',
  categories: [
    {
      id: 'c1',
      title: 'Wok',
      items: [
        dish({
          variants: [
            { id: 'v1', name: 'Vegetarian', description: '', price: 14 },
            { id: 'v2', name: 'With chicken', description: '', price: 16 },
          ],
        }),
        dish({ id: 'd2', name: 'Fried rice', price: 13 }),
      ],
    },
    { id: 'c2', title: 'Drinks', items: [] },
  ],
};

/** See GitHub issue #2182. */
describe('menu edits', () => {
  describe('saveDish', () => {
    it('replaces a dish in place', () => {
      const next = saveDish(
        MENU,
        'c1',
        dish({ id: 'd2', name: 'Egg rice', price: 12 }),
      );

      expect(next.categories[0].items.map((item) => item.name)).toEqual([
        'Pad Thai',
        'Egg rice',
      ]);
      expect(next.categories[1]).toBe(MENU.categories[1]);
    });

    it('appends a new dish to its category', () => {
      const next = saveDish(
        MENU,
        'c2',
        dish({ id: 'd3', name: 'Water', price: 3 }),
      );

      expect(next.categories[1].items.map((item) => item.id)).toEqual(['d3']);
    });

    it('does not touch the stored menu', () => {
      saveDish(MENU, 'c1', dish({ id: 'd2', name: 'Changed' }));

      expect(MENU.categories[0].items[1].name).toBe('Fried rice');
    });
  });

  describe('setAvailability', () => {
    it('switches a dish off', () => {
      const next = setAvailability(
        MENU,
        { categoryId: 'c1', itemId: 'd2' },
        false,
      );

      expect(next.categories[0].items[1].isAvailable).toBe(false);
    });

    it('switches one variant off and leaves the others', () => {
      const next = setAvailability(
        MENU,
        { categoryId: 'c1', itemId: 'd1', variantId: 'v2' },
        false,
      );
      const variants = next.categories[0].items[0].variants ?? [];

      expect(variants.map((variant) => variant.isAvailable)).toEqual([
        undefined,
        false,
      ]);
      expect(next.categories[0].items[0].isAvailable).toBeUndefined();
    });
  });

  describe('saveCategoryDetails', () => {
    it('renames a category and trims what was typed', () => {
      const next = saveCategoryDetails(MENU, 'c2', {
        title: ' Drinks & wine ',
        subtitle: ' Cold ',
      });

      expect(next.categories[1]).toMatchObject({
        title: 'Drinks & wine',
        subtitle: 'Cold',
      });
    });

    it('clears a subtitle taken back', () => {
      const next = saveCategoryDetails(MENU, 'c2', {
        title: 'Drinks',
        subtitle: '  ',
      });

      expect(next.categories[1].subtitle).toBe('');
    });

    it('adds a new category at the end, empty', () => {
      const next = saveCategoryDetails(MENU, undefined, { title: 'Desserts' });

      expect(next.categories[2]).toEqual({
        id: 'new-id',
        title: 'Desserts',
        subtitle: '',
        items: [],
      });
    });
  });

  it('writes a category’s extras', () => {
    const extrasBlock = { description: 'Toppings', extras: [] };

    expect(saveExtras(MENU, 'c1', extrasBlock).categories[0].extrasBlock).toBe(
      extrasBlock,
    );
  });

  /** See GitHub issue #2181. */
  describe('removeDish', () => {
    it('takes the dish and its variants off its category', () => {
      const next = removeDish(MENU, 'c1', 'd1');

      expect(next.categories[0].items?.map((item) => item.id)).toEqual(['d2']);
      expect(next.categories[1]).toBe(MENU.categories[1]);
    });

    it('leaves the menu as it was when no dish has that id', () => {
      expect(removeDish(MENU, 'c1', 'missing').categories[0].items).toEqual(
        MENU.categories[0].items,
      );
    });

    it('does not touch the stored menu', () => {
      removeDish(MENU, 'c1', 'd1');

      expect(MENU.categories[0].items).toHaveLength(2);
    });
  });

  describe('removeCategory', () => {
    it('takes the category off with everything in it', () => {
      const next = removeCategory(MENU, 'c1');

      expect(next.categories.map((category) => category.id)).toEqual(['c2']);
    });

    it('does not touch the stored menu', () => {
      removeCategory(MENU, 'c1');

      expect(MENU.categories).toHaveLength(2);
    });
  });

  it('moves a category', () => {
    expect(moveCategory(MENU, 1, 0).categories.map(({ id }) => id)).toEqual([
      'c2',
      'c1',
    ]);
  });

  it('moves a dish within its category', () => {
    expect(
      moveDish(MENU, 'c1', 0, 1).categories[0].items.map(({ id }) => id),
    ).toEqual(['d2', 'd1']);
  });

  it('keeps the list when a move names no dish', () => {
    expect(moveDish(MENU, 'c2', 3, 0).categories[1].items).toEqual([]);
  });

  describe('editableDish', () => {
    it('leaves a dish with named variants as it is', () => {
      const stored = MENU.categories[0].items[0];

      expect(editableDish(stored)).toEqual(stored);
    });

    it('gives a dish without variants an empty list', () => {
      expect(editableDish(dish({ price: 9 })).variants).toEqual([]);
    });

    it('names a variant that only repeated its dish by its description', () => {
      const legacy = dish({
        name: 'Margherita',
        price: 0,
        variants: [
          {
            id: 'v1',
            name: 'Margherita',
            description: 'Large 40 cm',
            price: 14,
          },
        ],
      });

      expect(editableDish(legacy).variants).toEqual([
        { id: 'v1', name: 'Large 40 cm', description: '', price: 14 },
      ]);
    });

    it('turns the price of a dish with variants into a first, unnamed variant', () => {
      const legacy = dish({
        name: 'Margherita',
        price: 11,
        isAvailable: false,
        variants: [{ id: 'v1', name: 'Large', description: '', price: 14 }],
      });

      const editable = editableDish(legacy);

      expect(editable.price).toBe(0);
      expect(editable.variants).toEqual([
        {
          id: 'new-id',
          name: '',
          description: '',
          price: 11,
          isAvailable: false,
        },
        { id: 'v1', name: 'Large', description: '', price: 14 },
      ]);
    });
  });

  describe('priceLabel', () => {
    it.each([
      [7.5, 'CHF', 'CHF 7.50'],
      [14, undefined, '14.00'],
      [undefined, 'CHF', ''],
      [Number.NaN, 'CHF', ''],
    ])('reads %s %s as "%s"', (price, currency, expected) => {
      expect(priceLabel(price as number | undefined, currency)).toBe(expected);
    });
  });
});
