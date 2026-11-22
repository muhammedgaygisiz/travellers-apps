import {
  buildInitialMenu,
  buildInitialMenuItems,
  chooseInitialMenuCurrency,
  INITIAL_MENU_CATEGORY_TITLE,
} from '../initial-menu';

describe('initial menu helpers', () => {
  it('turns candidate Bites into one menu item per dish', () => {
    const items = buildInitialMenuItems([
      { name: 'Margherita', price: 12 },
      { name: 'Tiramisu', price: 7 },
    ]);

    expect(items).toEqual([
      {
        id: expect.any(String),
        name: 'Margherita',
        description: '',
        price: 12,
        isAvailable: true,
      },
      {
        id: expect.any(String),
        name: 'Tiramisu',
        description: '',
        price: 7,
        isAvailable: true,
      },
    ]);
  });

  it('groups Bites that describe the same dish and averages their prices', () => {
    const items = buildInitialMenuItems([
      { name: 'Margherita', price: 12 },
      { name: '  margherita!  ', price: 13 },
      { name: 'Tiramisu', price: 7 },
    ]);

    expect(items).toEqual([
      {
        id: expect.any(String),
        name: 'Margherita',
        description: '',
        price: 12.5,
        isAvailable: true,
      },
      {
        id: expect.any(String),
        name: 'Tiramisu',
        description: '',
        price: 7,
        isAvailable: true,
      },
    ]);
  });

  it('rounds averaged prices to two decimals', () => {
    const items = buildInitialMenuItems([
      { name: 'Ramen', price: 10 },
      { name: 'Ramen', price: 11 },
      { name: 'Ramen', price: 11 },
    ]);

    expect(items[0].price).toBe(10.67);
  });

  it('keeps dishes with unusable prices at zero', () => {
    const items = buildInitialMenuItems([
      { name: 'Tap water', price: 0 },
      { name: 'Bread' },
    ]);

    expect(items.map((item) => item.price)).toEqual([0, 0]);
  });

  it('ignores unpriced Bites when averaging a dish price', () => {
    const items = buildInitialMenuItems([
      { name: 'Ramen', price: 12 },
      { name: 'Ramen', price: 0 },
    ]);

    expect(items[0].price).toBe(12);
  });

  it('orders dishes by Bite evidence and then by name', () => {
    const items = buildInitialMenuItems([
      { name: 'Tiramisu', price: 7 },
      { name: 'Margherita', price: 12 },
      { name: 'Margherita', price: 12 },
      { name: 'Calzone', price: 14 },
    ]);

    expect(items.map((item) => item.name)).toEqual([
      'Margherita',
      'Calzone',
      'Tiramisu',
    ]);
  });

  it('keeps dish names that normalize to nothing apart', () => {
    const items = buildInitialMenuItems([
      { name: 'ラーメン', price: 12 },
      { name: '餃子', price: 6 },
    ]);

    expect(items.map((item) => item.name)).toEqual(['ラーメン', '餃子']);
  });

  it('skips Bites without a usable name', () => {
    const items = buildInitialMenuItems([
      { name: '   ', price: 12 },
      { price: 12 },
      { name: 'Margherita', price: 12 },
    ]);

    expect(items.map((item) => item.name)).toEqual(['Margherita']);
  });

  it('puts every dish into one category', () => {
    const { categories } = buildInitialMenu([
      { name: 'Margherita', price: 12 },
      { name: 'Tiramisu', price: 7 },
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0].title).toBe(INITIAL_MENU_CATEGORY_TITLE);
    expect(categories[0].items).toHaveLength(2);
  });

  /**
   * A menu is born with ids rather than created without them and migrated
   * moments later by the admin backfill (issue #1099).
   */
  it('gives the category and every dish an id of its own', () => {
    const {
      categories: [category],
    } = buildInitialMenu([
      { name: 'Margherita', price: 12 },
      { name: 'Tiramisu', price: 7 },
    ]);

    const ids = [category.id, ...category.items.map((item) => item.id)];

    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the menu empty when no Bite evidence is usable', () => {
    expect(buildInitialMenu([]).categories).toEqual([]);
    expect(buildInitialMenu([{ price: 12 }]).categories).toEqual([]);
  });
});

/**
 * The derived menu states the currency its prices are in (GitHub issue #1511):
 * the Bites first, their country when the Bites leave it open, else none.
 */
describe('initial menu currency', () => {
  const prices = (bites: Parameters<typeof buildInitialMenu>[0]): number[] =>
    buildInitialMenu(bites).categories[0].items.map((item) => item.price);

  it('takes the currency most priced Bites were paid in', () => {
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, currency: 'CHF' },
        { name: 'Margherita', price: 13, currency: 'chf ' },
        { name: 'Tiramisu', price: 7, currency: 'EUR' },
      ]),
    ).toBe('CHF');
  });

  it('ignores the currency of a Bite that gives no usable price or dish', () => {
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, currency: 'CHF' },
        { name: 'Tiramisu', price: 0, currency: 'EUR' },
        { price: 9, currency: 'EUR' },
      ]),
    ).toBe('CHF');
  });

  it('settles a tie with the country the Bites were taken in', () => {
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, currency: 'USD', countryCode: 'ch' },
        { name: 'Tiramisu', price: 7, currency: 'GBP', countryCode: 'CH' },
      ]),
    ).toBe('CHF');
  });

  it('takes the country when no priced Bite records a currency', () => {
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, countryCode: 'JP' },
      ]),
    ).toBe('JPY');
  });

  it('states none when the Bites tie and the country is unknown or split', () => {
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, currency: 'USD' },
        { name: 'Tiramisu', price: 7, currency: 'GBP' },
      ]),
    ).toBeUndefined();
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, countryCode: 'CH' },
        { name: 'Tiramisu', price: 7, countryCode: 'DE' },
      ]),
    ).toBeUndefined();
    expect(
      chooseInitialMenuCurrency([
        { name: 'Margherita', price: 12, countryCode: 'XX' },
      ]),
    ).toBeUndefined();
  });

  it('averages only the prices paid in the menu currency', () => {
    const menu = buildInitialMenu([
      { name: 'Margherita', price: 12, currency: 'CHF' },
      { name: 'Margherita', price: 14, currency: 'CHF' },
      { name: 'Margherita', price: 40, currency: 'EUR' },
      { name: 'Margherita', price: 99 },
    ]);

    expect(menu.currency).toBe('CHF');
    expect(menu.categories[0].items[0].price).toBe(13);
  });

  it('keeps a dish no Bite priced in the menu currency, at 0', () => {
    expect(
      prices([
        { name: 'Margherita', price: 12, currency: 'CHF' },
        { name: 'Margherita', price: 14, currency: 'CHF' },
        { name: 'Tiramisu', price: 7, currency: 'EUR' },
      ]),
    ).toEqual([13, 0]);
  });

  it('prices currency-less Bites in the country currency when none states one', () => {
    const menu = buildInitialMenu([
      { name: 'Margherita', price: 12, countryCode: 'CH' },
      { name: 'Margherita', price: 14, countryCode: 'CH' },
    ]);

    expect(menu).toMatchObject({ currency: 'CHF' });
    expect(menu.categories[0].items[0].price).toBe(13);
  });

  it('averages every price, as before, when the menu states no currency', () => {
    const menu = buildInitialMenu([
      { name: 'Margherita', price: 12 },
      { name: 'Margherita', price: 14 },
    ]);

    expect(menu).not.toHaveProperty('currency');
    expect(menu.categories[0].items[0].price).toBe(13);
  });
});

/** See GitHub issue #2216. */
describe('initial menu links to its Bites', () => {
  it('names the item each Bite was grouped into', () => {
    const menu = buildInitialMenu([
      { id: 'b1', name: 'Margherita', price: 12 },
      { id: 'b2', name: 'margherita ', price: 14 },
      { id: 'b3', name: 'Tiramisu', price: 7 },
    ]);
    const [margherita, tiramisu] = menu.categories[0].items;

    expect(menu.menuItemIdByBiteId).toEqual({
      b1: margherita.id,
      b2: margherita.id,
      b3: tiramisu.id,
    });
  });

  it('links a Bite whose price did not count, because the dish is the same', () => {
    const menu = buildInitialMenu([
      { id: 'b1', name: 'Margherita', price: 12, currency: 'CHF' },
      { id: 'b2', name: 'Margherita', price: 14, currency: 'CHF' },
      { id: 'b3', name: 'Margherita', price: 40, currency: 'EUR' },
    ]);

    expect(menu.menuItemIdByBiteId['b3']).toBe(menu.categories[0].items[0].id);
  });

  it('links nothing for a Bite without a usable name or without an id', () => {
    const menu = buildInitialMenu([
      { id: 'b1', name: '  ', price: 12 },
      { name: 'Margherita', price: 12 },
    ]);

    expect(menu.menuItemIdByBiteId).toEqual({});
  });
});
