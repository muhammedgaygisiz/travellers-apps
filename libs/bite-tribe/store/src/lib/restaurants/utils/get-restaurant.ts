import { Restaurant } from 'model';
import { normalize } from 'utils';

export const getRestaurant = (restaurants: Restaurant[], id: string) => {
  const foundRestaurantById = restaurants.find((restaurant) => {
    const normalizedRestaurantId = normalize(restaurant.id);
    if (id) {
      return normalizedRestaurantId.includes(normalize(id));
    }

    return false;
  });

  if (foundRestaurantById) {
    return foundRestaurantById;
  }

  const restaurantName = decodeURIComponent(id);
  return restaurants.find((restaurant) => {
    return (
      restaurant.name.toLowerCase().includes(restaurantName.toLowerCase()) ||
      restaurantName.toLowerCase().includes(restaurant.name.toLowerCase())
    );
  });
};
