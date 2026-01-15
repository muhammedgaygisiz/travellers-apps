import { getBitesByRestaurantIdOrName } from '../get-bites-by-restaurant-id-or-name';
import type { Bite } from 'model';

describe('getBitesByRestaurantIdOrName', () => {
  const bites = [
    { id: '1', place: 'Pizza Hut', restaurantId: 'rest1' } as Bite,
    { id: '2', place: 'Burger King', restaurantId: 'rest2' } as Bite,
    { id: '3', place: 'Sushi Place', restaurantId: 'rest3' } as Bite,
    { id: '4', place: 'Pasta Corner', restaurantId: 'rest4' } as Bite,
  ];

  it('should return bites matching the exact restaurant name', () => {
    const result = getBitesByRestaurantIdOrName('pizza hut', bites);
    expect(result).toEqual([
      { id: '1', place: 'Pizza Hut', restaurantId: 'rest1' },
    ]);
  });

  it('should return bites matching the restaurant ID', () => {
    const result = getBitesByRestaurantIdOrName('rest2', bites);
    expect(result).toEqual([
      { id: '2', place: 'Burger King', restaurantId: 'rest2' },
    ]);
  });

  it('should return bites with similar restaurant names', () => {
    const result = getBitesByRestaurantIdOrName('sushi plc', bites);
    expect(result).toEqual([
      { id: '3', place: 'Sushi Place', restaurantId: 'rest3' },
    ]);
  });

  it('should return an empty array if no matches are found', () => {
    const result = getBitesByRestaurantIdOrName('nonexistent', bites);
    expect(result).toEqual([]);
  });
});
