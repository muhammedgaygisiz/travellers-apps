import { Bite } from 'model';
import { normalize, getSimilarityScore } from 'utils';

export const getBitesByRestaurantName = (
  normalizedRestaurantName: string,
  bites: Bite[],
  restaurantId: string
) =>
  bites.filter((bite) => {
    const normalizedBitePlace = normalize(bite.place);

    // Use fast-fuzzy to match restaurant names with a threshold
    const similarityScore = getSimilarityScore(
      normalizedBitePlace,
      normalizedRestaurantName
    );

    return (
      bite.restaurantId?.includes(restaurantId) || similarityScore.length > 0
    );
  });
