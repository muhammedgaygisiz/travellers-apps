import { Bite } from 'model';
import { getSimilarityScore, normalize } from 'utils';

const cleanupTags = (tags: string[] = []) =>
  tags.map((tag: string) => tag.replace('#', ''));

export const handleTagFilters = (filters: string[], filteredBites: Bite[]) => {
  const tagFilters = filters.filter((filter) => filter !== 'nearby');

  if (tagFilters.length > 0) {
    filteredBites = filteredBites.filter((bite) => {
      if (!bite.tags || !Array.isArray(bite.tags)) {
        return false;
      }

      // Clean tags by removing # symbols for comparison
      const cleanTags = cleanupTags(bite.tags);

      return tagFilters.some((rawfilter) => {
        const filter = normalize(rawfilter);

        return cleanTags.some((tag) => {
          const similarityScore = getSimilarityScore(tag, filter);

          return filter.includes(tag) || similarityScore.length > 0;
        });
      });
    });
  }

  return filteredBites;
};
