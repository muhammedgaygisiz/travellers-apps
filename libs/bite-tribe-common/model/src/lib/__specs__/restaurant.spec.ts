import {
  isRestaurantCategory,
  MAX_RESTAURANT_CATEGORIES,
  RESTAURANT_CATEGORIES,
  restaurantCategoriesOf,
  type Restaurant,
} from '../restaurant';

/** See GitHub issue #2131. */
describe('restaurant categories', () => {
  it('is the fixed list of ten, with two allowed at once', () => {
    expect(RESTAURANT_CATEGORIES).toHaveLength(10);
    expect(MAX_RESTAURANT_CATEGORIES).toBe(2);
  });

  it.each([
    ['cafe', true],
    ['food-hall', true],
    ['nightclub', false],
    [undefined, false],
    [7, false],
  ])('knows whether %j is a category', (value, known) => {
    expect(isRestaurantCategory(value)).toBe(known);
  });

  it.each([
    [undefined, []],
    [{}, []],
    [{ categories: [] }, []],
    [{ categories: ['cafe', 'bakery'] }, ['cafe', 'bakery']],
    [{ categories: ['cafe', 'nightclub'] }, ['cafe']],
    [{ categories: ['bar', 'bar', 'pub'] }, ['bar', 'pub']],
    [{ categories: ['bar', 'pub', 'cafe'] }, ['bar', 'pub']],
  ])('reads %j as %j', (restaurant, expected) => {
    expect(
      restaurantCategoriesOf(
        restaurant as Pick<Restaurant, 'categories'> | undefined,
      ),
    ).toEqual(expected);
  });
});
