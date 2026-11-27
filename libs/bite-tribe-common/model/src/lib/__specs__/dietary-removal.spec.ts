import {
  dietaryRemovalThreshold,
  dietaryStrikesWithin,
  menuDietaryLabelsOf,
  menuDietaryOf,
  needsDietaryLabelApproval,
  removedDietaryLabelsOf,
  withMenuDietary,
  withoutMenuItemDietary,
} from '../dietary-removal';
import type { Menu } from '../menu';

const removal = {
  removedAt: '2026-11-01T00:00:00.000Z',
  disputes: 3,
  confirmations: 0,
  reasons: { 'animal-product': 3 },
};

const legacyMenu = (): Menu => ({
  id: 'menu-1',
  categories: [
    {
      id: 'c1',
      title: 'Mains',
      items: [
        {
          id: 'pad-thai',
          name: 'Pad Thai',
          description: '',
          price: 12,
          dietaryLabels: ['vegan'],
          variants: [
            {
              id: 'pad-thai-tofu',
              name: 'Tofu',
              description: '',
              price: 12,
              dietaryLabels: ['gluten-free'],
              dietaryOptions: ['nut-free'],
            },
          ],
        },
      ],
    },
  ],
});

/** See GitHub issue #2198. */
describe('dietary removal', () => {
  it('removes a high-risk label at a lower threshold than a lifestyle one', () => {
    expect(dietaryRemovalThreshold('vegan')).toBe(3);
    expect(dietaryRemovalThreshold('halal')).toBe(2);
  });

  it('leaves a menu without the map as it was stored', () => {
    const menu = legacyMenu();

    expect(withMenuDietary(menu)).toBe(menu);
  });

  it('takes every label from the map once it exists, and ignores the item fields', () => {
    const menu: Menu = {
      ...legacyMenu(),
      dietary: {
        'pad-thai': { labels: ['vegetarian'], removed: { vegan: removal } },
        'pad-thai-tofu': { options: ['vegan'] },
      },
    };

    const dish = withMenuDietary(menu).categories[0].items[0];

    expect(dish.dietaryLabels).toEqual(['vegetarian']);
    expect(dish.removedDietaryLabels).toEqual(['vegan']);
    expect(dish.variants?.[0].dietaryLabels).toBeUndefined();
    expect(dish.variants?.[0].dietaryOptions).toEqual(['vegan']);
    expect(dish.variants?.[0].removedDietaryLabels).toBeUndefined();
  });

  it('never shows a removed label as a label, even when the map still lists it', () => {
    const menu: Menu = {
      ...legacyMenu(),
      dietary: {
        'pad-thai': { labels: ['vegan'], removed: { vegan: removal } },
      },
    };

    const dish = withMenuDietary(menu).categories[0].items[0];

    expect(dish.dietaryLabels).toBeUndefined();
    expect(dish.removedDietaryLabels).toEqual(['vegan']);
  });

  it('collects every item for the save, an empty one included', () => {
    const menu = legacyMenu();
    menu.categories[0].items.push({
      id: 'rice',
      name: 'Rice',
      description: '',
      price: 3,
    });

    expect(menuDietaryLabelsOf(menu)).toEqual({
      'pad-thai': { labels: ['vegan'], options: [] },
      'pad-thai-tofu': { labels: ['gluten-free'], options: ['nut-free'] },
      rice: { labels: [], options: [] },
    });
  });

  it('strips the dietary fields from the client write', () => {
    const stripped = withoutMenuItemDietary(
      withMenuDietary({
        ...legacyMenu(),
        dietary: { 'pad-thai': { removed: { vegan: removal } } },
      }).categories,
    );
    const dish = stripped[0].items[0];

    expect(dish).not.toHaveProperty('dietaryLabels');
    expect(dish).not.toHaveProperty('removedDietaryLabels');
    expect(dish.variants?.[0]).not.toHaveProperty('dietaryOptions');
    expect(dish.name).toBe('Pad Thai');
  });

  it('reads a stored map defensively', () => {
    expect(menuDietaryOf(undefined)).toBeUndefined();
    expect(menuDietaryOf(['vegan'])).toBeUndefined();
    expect(menuDietaryOf({ a: 'nonsense' })).toEqual({ a: {} });
    expect(
      removedDietaryLabelsOf({
        removed: { kosher: removal, x: removal },
      } as never),
    ).toEqual(['kosher']);
  });

  it('needs an operator once three removals fall within twelve months', () => {
    const now = new Date('2026-11-27T00:00:00.000Z');
    const strike = (
      removedAt: string,
    ): { menuItemId: string; label: string; removedAt: string } => ({
      menuItemId: 'm',
      label: 'vegan',
      removedAt,
    });
    const recent = [
      strike('2026-11-01T00:00:00.000Z'),
      strike('2026-06-01T00:00:00.000Z'),
    ];

    expect(needsDietaryLabelApproval(recent, now)).toBe(false);
    expect(
      needsDietaryLabelApproval(
        [...recent, strike('2025-11-01T00:00:00.000Z')],
        now,
      ),
    ).toBe(false);
    expect(
      needsDietaryLabelApproval(
        [...recent, strike('2026-01-01T00:00:00.000Z')],
        now,
      ),
    ).toBe(true);
    expect(dietaryStrikesWithin('nonsense', now)).toEqual([]);
  });
});
