import { search } from 'fast-fuzzy';

const FUZZY_THRESHOLD = 0.8;

export const getSimilarityScore = (term: string, candidate: string) =>
  search(term, [candidate], {
    returnMatchData: true,
    threshold: FUZZY_THRESHOLD,
  });
