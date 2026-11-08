import { isRestaurantOwner, restaurantOwnerIds } from '../restaurant-ownership';

describe('restaurant ownership (epic #1614)', () => {
  it('reads the single-owner field', () => {
    expect(restaurantOwnerIds({ ownerUserId: 'a' })).toEqual(['a']);
  });

  it('reads the set', () => {
    expect(restaurantOwnerIds({ ownerUserIds: ['a', 'b'] })).toEqual([
      'a',
      'b',
    ]);
  });

  it('returns the union, deduplicated', () => {
    expect(
      restaurantOwnerIds({ ownerUserId: 'a', ownerUserIds: ['a', 'b'] }),
    ).toEqual(['a', 'b']);
  });

  it.each([
    [undefined],
    [{}],
    [{ ownerUserId: '' }],
    [{ ownerUserIds: 'a' }],
    [{ ownerUserIds: ['', 7, null] }],
  ])('reads %p as unheld', (restaurant) => {
    expect(restaurantOwnerIds(restaurant)).toEqual([]);
  });

  it('admits a member of either field and nobody else', () => {
    const restaurant = { ownerUserId: 'a', ownerUserIds: ['b'] };

    expect(isRestaurantOwner(restaurant, 'a')).toBe(true);
    expect(isRestaurantOwner(restaurant, 'b')).toBe(true);
    expect(isRestaurantOwner(restaurant, 'c')).toBe(false);
    expect(isRestaurantOwner(restaurant, undefined)).toBe(false);
  });
});
