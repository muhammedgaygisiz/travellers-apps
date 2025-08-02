import { Bite } from 'model';
import { getSimilarityScore, normalize } from 'utils';

const cleanupTags = (tags: string[] = []) =>
  tags.map((tag: string) => tag.replace('#', ''));

export const handleTagFilters = (filters: string[], bites: Bite[]) => {
  if (filters.length > 0) {
    bites = bites.filter((bite) => {
      if (!bite.tags || !Array.isArray(bite.tags)) {
        return false;
      }

      // Clean tags by removing # symbols for comparison
      const cleanTags = cleanupTags(bite.tags);

      return filters.every((rawfilter) => {
        const filter = normalize(rawfilter);

        return cleanTags.some((tag) => {
          const similarityScore = getSimilarityScore(tag, filter);

          return filter.includes(tag) || similarityScore.length > 0;
        });
      });
    });
  }

  return bites;
};
