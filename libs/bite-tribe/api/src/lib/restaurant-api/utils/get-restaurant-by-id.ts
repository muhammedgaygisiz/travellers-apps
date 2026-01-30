import type { Restaurant } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { RESTAURANT_COLLECTION } from '../../utils/constants';

export const getRestaurantById = async (
  restaurantId: string,
): Promise<Restaurant | undefined> => {
  try {
    // First try to get by ID
    const doc = await FirebaseFirestore.getDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
    });

    if (doc.snapshot.data) {
      const data = doc.snapshot.data;
      return {
        id: data?.['id'] || restaurantId,
        ...data,
      } as Restaurant;
    }

    // If no restaurant found by ID, try to find by name
    const queryResult = await FirebaseFirestore.getCollection({
      reference: RESTAURANT_COLLECTION,
      queryConstraints: [
        {
          type: 'limit',
          limit: 10,
        },
      ],
    });

    const restaurantName = decodeURIComponent(restaurantId);
    const matchingRestaurant = queryResult.snapshots?.find(
      (snapshot) =>
        snapshot.data?.['name']?.toLowerCase() === restaurantName.toLowerCase(),
    );

    if (matchingRestaurant) {
      const data = matchingRestaurant.data;
      return {
        id: data?.['id'] || matchingRestaurant.id,
        ...data,
      } as Restaurant;
    }

    return undefined;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return undefined;
  }
};
