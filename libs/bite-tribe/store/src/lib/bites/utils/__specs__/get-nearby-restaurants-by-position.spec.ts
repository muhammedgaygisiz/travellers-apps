import { getNearbyRestaurantsByPosition } from '../get-nearby-restaurants-by-position';
import { Bite } from 'model';

describe('getNearbyRestaurantsByPosition', () => {
  it('should return an empty array when no bites are nearby', () => {
    const bites = [] as Bite[];

    const result = getNearbyRestaurantsByPosition(bites);

    expect(result).toEqual([]);
  });

  it('should return unique restaurants sorted alphabetically by name', () => {
    const bites = [
      {
        id: '1',
        place: 'Pizza Place',
        distance: '0.5',
        position: { latitude: 1, longitude: 2 },
      },
      {
        id: '2',
        place: 'Burger Joint',
        distance: '0.5',
        position: { latitude: 3, longitude: 4 },
      },
      {
        id: '3',
        place: 'Pizza Place',
        distance: '0.5',
        position: { latitude: 1, longitude: 2 },
      },
    ] as Bite[];

    const result = getNearbyRestaurantsByPosition(bites);

    expect(result.map((restaurant) => restaurant.name)).toEqual([
      'Burger Joint',
      'Pizza Place',
    ]);
  });

  it('should carry the position of the nearest bite for each restaurant', () => {
    const bites = [
      {
        id: '1',
        place: 'Pizza Place',
        distance: '2',
        position: { latitude: 10, longitude: 20 },
      },
      {
        id: '2',
        place: 'Pizza Place',
        distance: '0.5',
        position: { latitude: 11, longitude: 21 },
      },
    ] as Bite[];

    const result = getNearbyRestaurantsByPosition(bites);

    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ latitude: 11, longitude: 21 });
    expect(result[0].distance).toBe('0.5');
  });

  it('should expose the restaurant id when any matching bite is verified', () => {
    const bites = [
      {
        id: '1',
        place: 'Pizza Place',
        distance: '1',
        position: { latitude: 10, longitude: 20 },
      },
      {
        id: '2',
        place: 'Pizza Place',
        distance: '2',
        position: { latitude: 11, longitude: 21 },
        restaurantId: 'restaurant-123',
      },
    ] as Bite[];

    const result = getNearbyRestaurantsByPosition(bites);

    expect(result[0].restaurantId).toBe('restaurant-123');
  });

  it('should leave the restaurant id undefined when no bite is verified', () => {
    const bites = [
      {
        id: '1',
        place: 'Pizza Place',
        distance: '1',
        position: { latitude: 10, longitude: 20 },
      },
    ] as Bite[];

    const result = getNearbyRestaurantsByPosition(bites);

    expect(result[0].restaurantId).toBeUndefined();
  });
});
