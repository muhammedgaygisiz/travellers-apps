import {
  DIETARY_LABELS,
  dietaryLabelClass,
  dietaryLabelsOf,
  isDietaryLabel,
  isRestaurantDietaryStatement,
  menuItemDietaryOf,
  RESTAURANT_DIETARY_STATEMENTS,
  restaurantDietaryStatementsOf,
} from '../dietary-label';

/** See GitHub issue #2194. */
describe('dietary labels', () => {
  it('is the fixed list of nine, each with its class', () => {
    expect(DIETARY_LABELS).toEqual([
      'vegan',
      'vegetarian',
      'pescatarian',
      'alcohol-free',
      'gluten-free',
      'lactose-free',
      'nut-free',
      'halal',
      'kosher',
    ]);
    expect(
      DIETARY_LABELS.filter(
        (label) => dietaryLabelClass(label) === 'high-risk',
      ),
    ).toEqual(['gluten-free', 'lactose-free', 'nut-free', 'halal', 'kosher']);
  });

  it.each([
    ['vegan', true],
    ['halal', true],
    ['keto', false],
    ['toString', false],
    [undefined, false],
    [3, false],
  ])('knows whether %j is a label', (value, known) => {
    expect(isDietaryLabel(value)).toBe(known);
  });

  it.each([
    [undefined, []],
    ['vegan', []],
    [[], []],
    [
      ['halal', 'vegan'],
      ['vegan', 'halal'],
    ],
    [['vegan', 'keto', 'vegan'], ['vegan']],
  ])('reads %j as %j', (values, expected) => {
    expect(dietaryLabelsOf(values)).toEqual(expected);
  });

  it('never offers as an option a label the dish already fits', () => {
    expect(
      menuItemDietaryOf({
        dietaryLabels: ['vegetarian'],
        dietaryOptions: ['vegan', 'vegetarian', 'keto'],
      }),
    ).toEqual({ labels: ['vegetarian'], options: ['vegan'] });
    expect(menuItemDietaryOf(undefined)).toEqual({ labels: [], options: [] });
  });
});

describe('restaurant dietary statements', () => {
  it('is the fixed list of five', () => {
    expect(RESTAURANT_DIETARY_STATEMENTS).toHaveLength(5);
    expect(isRestaurantDietaryStatement('fully-halal')).toBe(true);
    expect(isRestaurantDietaryStatement('fully-keto')).toBe(false);
  });

  it('drops unknown values and repeats, in list order', () => {
    expect(
      restaurantDietaryStatementsOf([
        'fully-halal',
        'fully-keto',
        'fully-plant-based',
        'fully-halal',
      ]),
    ).toEqual(['fully-plant-based', 'fully-halal']);
    expect(restaurantDietaryStatementsOf(undefined)).toEqual([]);
  });
});
