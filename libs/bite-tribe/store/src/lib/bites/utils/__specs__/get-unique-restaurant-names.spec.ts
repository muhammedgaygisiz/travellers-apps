import { getUniqueRestaurantNames } from '../get-unique-restaurant-names';
import { Bite } from 'model';

describe('getUniqueRestaurantNames', () => {
  it('should return unique restaurant names from the bites array', () => {
    const bites = [
      { id: '1', place: 'Pizza Place' },
      { id: '2', place: 'Sushi Spot' },
      { id: '3', place: 'Pizza Place' },
      { id: '4', place: 'Burger Joint' },
      { id: '5', place: 'Sushi Spot' },
    ] as Bite[];

    const result = getUniqueRestaurantNames(bites);
    expect(result).toEqual(
      new Set(['Pizza Place', 'Sushi Spot', 'Burger Joint']),
    );
  });

  it('should return an empty array when given an empty bites array', () => {
    const bites: Bite[] = [];
    const result = getUniqueRestaurantNames(bites);
    expect(result).toEqual(new Set([]));
  });

  it('should handle bites with no restaurantName property', () => {
    const bites = [
      { id: '1' },
      { id: '2', place: 'Sushi Spot' },
      { id: '3', place: 'Pizza Place' },
      { id: '4' },
    ] as Bite[];

    const result = getUniqueRestaurantNames(bites);
    expect(result).toEqual(new Set(['Sushi Spot', 'Pizza Place']));
  });

  /**
   * The fuzzy dedup is quadratic and each comparison builds its own search
   * index, so repeated names must be collapsed before it runs. A feed of 440
   * Bites otherwise blocked the main thread for over a second on every like.
   * See GitHub issue #1357.
   */
  it('should not let repeated names change the result', () => {
    const once = getUniqueRestaurantNames([
      { id: '1', place: 'Pizza Place' },
      { id: '2', place: 'Sushi Spot' },
    ] as Bite[]);

    const repeated = getUniqueRestaurantNames([
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `p${i}`,
        place: 'Pizza Place',
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `s${i}`,
        place: 'Sushi Spot',
      })),
    ] as Bite[]);

    expect(repeated).toEqual(once);
  });
});
