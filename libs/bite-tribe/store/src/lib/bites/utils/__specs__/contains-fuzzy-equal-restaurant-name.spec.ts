import { containsFuzzyEqualRestaurantName } from '../contains-fuzzy-equal-restaurant-name';

describe('containsFuzzyEqualRestaurantName', () => {
  describe('given a list with similar restaurant names', () => {
    it('should return true', () => {
      const restaurantNames = ['Pizza Palace', 'Burger Barn', 'Sushi Spot'];
      const restaurantNameToCheck = 'Pizza Palce'; // Slightly misspelled

      const result = containsFuzzyEqualRestaurantName(
        restaurantNameToCheck,
        restaurantNames,
      );

      expect(result).toBe(true);
    });
  });

  describe('given a list without similar restaurant names', () => {
    it('should return false', () => {
      const restaurantNames = ['Pizza Palace', 'Burger Barn', 'Sushi Spot'];
      const restaurantNameToCheck = 'Taco Town';

      const result = containsFuzzyEqualRestaurantName(
        restaurantNameToCheck,
        restaurantNames,
      );

      expect(result).toBe(false);
    });
  });
});
