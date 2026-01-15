import { getSimilarityScore, normalize } from 'utils';

export const isSimilar = (name1: string, name2: string): boolean => {
  const normalizedName1 = normalize(name1);
  const normalizedName2 = normalize(name2);

  const similarityScore = getSimilarityScore(normalizedName1, normalizedName2);

  return similarityScore.length > 0 && similarityScore[0].score >= 0.8;
};
