import { Bite } from 'model';
import { getBitesByRestaurantIdOrName } from './get-bites-by-restaurant-id-or-name';
import { normalize, getSimilarityScore } from 'utils';

/**
 * Get unique tag suggestions from bites at a given restaurant/place.
 * Uses fuzzy matching to find similar restaurant names.
 * Returns tags sorted alphabetically, deduplicated using fuzzy logic.
 */
export const getTagSuggestionsByPlace = (
  placeName: string,
  allBites: Bite[],
): string[] => {
  if (!placeName || !placeName.trim()) {
    return [];
  }

  const normalizedPlaceName = normalize(placeName);

  // Get all bites from the same or similar restaurant
  const bitesAtPlace = getBitesByRestaurantIdOrName(
    normalizedPlaceName,
    allBites,
  );

  if (bitesAtPlace.length === 0) {
    return [];
  }

  // Collect all tags from these bites
  const tagsMap = new Map<string, string>();

  bitesAtPlace.forEach((bite) => {
    if (bite.tags && Array.isArray(bite.tags)) {
      bite.tags.forEach((tag: string) => {
        // Clean the tag (remove # symbols)
        const cleanTag = tag.replace(/#/g, '').trim();
        if (cleanTag) {
          const normalizedTag = normalize(cleanTag);

          // Check if we already have a similar tag
          let foundSimilar = false;
          for (const [
            existingNormalized,
            existingOriginal,
          ] of tagsMap.entries()) {
            const similarityScore = getSimilarityScore(
              normalizedTag,
              existingNormalized,
            );

            // If tags are very similar (score >= 0.8), use the longer one
            if (similarityScore.length > 0 && similarityScore[0].score >= 0.8) {
              foundSimilar = true;
              // Keep the longer tag as it's likely more descriptive
              if (cleanTag.length > existingOriginal.length) {
                tagsMap.delete(existingNormalized);
                tagsMap.set(normalizedTag, cleanTag);
              }
              break;
            }
          }

          if (!foundSimilar) {
            tagsMap.set(normalizedTag, cleanTag);
          }
        }
      });
    }
  });

  // Return sorted unique tags (using the original forms)
  return Array.from(tagsMap.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
};
