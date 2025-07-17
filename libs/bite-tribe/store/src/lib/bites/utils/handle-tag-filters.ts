import { Bite } from 'model';

export const handleTagFilters = (filters: string[], filteredBites: Bite[]) => {
  const tagFilters = filters.filter((filter) => filter !== 'nearby');
  if (tagFilters.length > 0) {
    filteredBites = filteredBites.filter((bite) => {
      if (!bite.tags || !Array.isArray(bite.tags)) {
        return false;
      }

      // Clean tags by removing # symbols for comparison
      const cleanTags = bite.tags.map((tag: string) => tag.replace('#', ''));

      return tagFilters.some((filter) =>
        cleanTags.includes(filter.toLowerCase())
      );
    });
  }
  return filteredBites;
};
