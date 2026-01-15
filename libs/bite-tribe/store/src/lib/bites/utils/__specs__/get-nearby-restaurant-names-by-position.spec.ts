import { getNearbyRestaurantNamesByPosition } from '../get-nearby-restaurant-names-by-position';
import { Bite } from 'model';

describe('getNearbyRestaurantNamesByPosition', () => {
  it('should return an empty array when no bites are nearby', () => {
    const bites = [] as Bite[];
    const result = getNearbyRestaurantNamesByPosition(bites);
    expect(result).toEqual([]);
  });

  it('should return unique restaurant names sorted alphabetically', () => {
    const bites = [
      { id: '1', place: 'Pizza Place', distance: '0.5' },
      { id: '2', place: 'Burger Joint', distance: '0.5' },
      { id: '3', place: 'Pizza Place', distance: '0.5' },
    ] as Bite[];
    const result = getNearbyRestaurantNamesByPosition(bites);
    expect(result).toEqual(['Burger Joint', 'Pizza Place']);
  });
});
