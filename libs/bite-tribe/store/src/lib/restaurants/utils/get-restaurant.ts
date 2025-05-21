import { Restaurant } from 'model';

export const getRestaurant = (restaurants: Restaurant[], id: string) => {
  const foundRestaurantById = restaurants.find((restaurant) => {
    if (id) {
      return restaurant.id.toLowerCase().includes(id.toLowerCase());
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
