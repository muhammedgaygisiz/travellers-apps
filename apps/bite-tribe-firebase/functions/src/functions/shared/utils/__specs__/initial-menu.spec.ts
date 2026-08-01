import {
  buildInitialMenuCategories,
  buildInitialMenuItems,
  INITIAL_MENU_CATEGORY_TITLE,
} from '../initial-menu';

describe('initial menu helpers', () => {
  it('turns candidate Bites into one menu item per dish', () => {
    const items = buildInitialMenuItems([
      { name: 'Margherita', price: 12 },
      { name: 'Tiramisu', price: 7 },
    ]);

    expect(items).toEqual([
      { name: 'Margherita', description: '', price: 12, isAvailable: true },
      { name: 'Tiramisu', description: '', price: 7, isAvailable: true },
    ]);
  });

  it('groups Bites that describe the same dish and averages their prices', () => {
    const items = buildInitialMenuItems([
      { name: 'Margherita', price: 12 },
      { name: '  margherita!  ', price: 13 },
      { name: 'Tiramisu', price: 7 },
    ]);

    expect(items).toEqual([
      { name: 'Margherita', description: '', price: 12.5, isAvailable: true },
      { name: 'Tiramisu', description: '', price: 7, isAvailable: true },
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
    const categories = buildInitialMenuCategories([
      { name: 'Margherita', price: 12 },
      { name: 'Tiramisu', price: 7 },
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0].title).toBe(INITIAL_MENU_CATEGORY_TITLE);
    expect(categories[0].items).toHaveLength(2);
  });

  it('keeps the menu empty when no Bite evidence is usable', () => {
    expect(buildInitialMenuCategories([])).toEqual([]);
    expect(buildInitialMenuCategories([{ price: 12 }])).toEqual([]);
  });
});
