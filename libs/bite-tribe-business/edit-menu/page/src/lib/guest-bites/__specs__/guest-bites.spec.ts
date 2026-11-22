import type { Bite, Menu } from 'model';
import { menuDishes, suggestedDish, unlinkedBites } from '../guest-bites';

const bite = (overrides: Partial<Bite>): Bite =>
  ({ id: 'b', name: 'Carbonara', ...overrides }) as Bite;

const MENU: Menu = {
  id: 'menu-1',
  categories: [
    {
      id: 'c1',
      title: 'Pasta',
      items: [
        {
          id: 'carbonara',
          name: 'Spaghetti Carbonara',
          description: '',
          price: 15,
        },
        { id: 'cacio', name: 'Cacio e pepe', description: '', price: 13 },
      ],
    },
    {
      id: 'c2',
      title: 'Dolci',
      items: [{ id: 'tiramisu', name: 'Tiramisù', description: '', price: 7 }],
    },
  ],
};

/** The Guest Bites page (GitHub issue #2216). */
describe('guest bites', () => {
  it('offers only Bites that are neither linked nor dismissed', () => {
    expect(
      unlinkedBites([
        bite({ id: 'open' }),
        bite({ id: 'linked', menuItemId: 'carbonara' }),
        bite({ id: 'dismissed', menuLinkDismissed: true }),
      ]).map(({ id }) => id),
    ).toEqual(['open']);
  });

  it('lists every dish with its category', () => {
    expect(
      menuDishes(MENU).map(({ categoryTitle, item }) => [
        categoryTitle,
        item.id,
      ]),
    ).toEqual([
      ['Pasta', 'carbonara'],
      ['Pasta', 'cacio'],
      ['Dolci', 'tiramisu'],
    ]);
  });

  it('suggests the dish whose name matches, ignoring case and accents', () => {
    expect(suggestedDish(bite({ name: 'tiramisu' }), MENU)?.id).toBe(
      'tiramisu',
    );
    expect(
      suggestedDish(bite({ name: 'Spaghetti carbonara ' }), MENU)?.id,
    ).toBe('carbonara');
  });

  /** Decision 1 of the issue: names only, no guessing. */
  it('suggests nothing for a name that only resembles a dish', () => {
    expect(suggestedDish(bite({ name: 'Carbonara' }), MENU)).toBeUndefined();
  });

  it('suggests nothing without a name or a menu', () => {
    expect(suggestedDish(bite({ name: '  ' }), MENU)).toBeUndefined();
    expect(suggestedDish(bite({}), undefined)).toBeUndefined();
  });
});
