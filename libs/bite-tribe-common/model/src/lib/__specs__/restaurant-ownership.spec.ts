import {
  isRestaurantOwner,
  RestaurantOwnership,
  restaurantOwnerIds,
} from '../restaurant-ownership';

describe('restaurant ownership (epic #1614)', () => {
  it('reads the set', () => {
    expect(restaurantOwnerIds({ ownerUserIds: ['a', 'b'] })).toEqual([
      'a',
      'b',
    ]);
  });

  it('deduplicates the set', () => {
    expect(restaurantOwnerIds({ ownerUserIds: ['a', 'a', 'b'] })).toEqual([
      'a',
      'b',
    ]);
  });

  it.each([
    [undefined],
    [{}],
    [{ ownerUserIds: 'a' }],
    [{ ownerUserIds: ['', 7, null] }],
  ])('reads %p as unheld', (restaurant) => {
    expect(restaurantOwnerIds(restaurant)).toEqual([]);
  });

  /**
   * The single-owner field is gone (issue #1754). A leftover one on a
   * document grants nothing, or it would silently reopen access the
   * migration closed.
   */
  it('ignores a leftover single-owner field', () => {
    const leftover = { ownerUserId: 'a' } as RestaurantOwnership;

    expect(restaurantOwnerIds(leftover)).toEqual([]);
    expect(isRestaurantOwner(leftover, 'a')).toBe(false);
  });

  it('admits a member of the set and nobody else', () => {
    const restaurant = { ownerUserIds: ['b'] };

    expect(isRestaurantOwner(restaurant, 'b')).toBe(true);
    expect(isRestaurantOwner(restaurant, 'c')).toBe(false);
    expect(isRestaurantOwner(restaurant, undefined)).toBe(false);
  });
});
