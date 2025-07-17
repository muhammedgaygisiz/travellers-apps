import { Bite } from 'model';
import { normalize, getSimilarityScore } from 'utils';

export const getBitesByRestaurantIdOrName = (
  normalizedRestaurantIdOrName: string,
  bites: Bite[]
) =>
  bites.filter((bite) => {
    const normalizedBitePlace = normalize(bite.place);

    if (normalizedBitePlace === normalizedRestaurantIdOrName) {
      return true;
    }

    // Use fast-fuzzy to match restaurant names with a threshold
    const similarityScore = getSimilarityScore(
      normalizedBitePlace,
      normalizedRestaurantIdOrName
    );

    return (
      bite.restaurantId?.includes(normalizedRestaurantIdOrName) ||
      similarityScore.length > 0
    );
  });
