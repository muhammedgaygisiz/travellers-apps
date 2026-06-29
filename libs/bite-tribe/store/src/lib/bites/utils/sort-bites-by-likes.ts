import type { Bite } from 'model';

const getTotalLikeCount = (bite: Bite): number => {
  const hasAggregateCount =
    typeof bite.thumbup === 'number' ||
    typeof bite.drooling === 'number' ||
    typeof bite.mindblown === 'number';

  if (hasAggregateCount) {
    return (bite.thumbup ?? 0) + (bite.drooling ?? 0) + (bite.mindblown ?? 0);
  }

  return bite?.likes?.length || 0;
};

export const sortBitesByLikes = (bites: Bite[]): Bite[] => {
  return bites.sort((a, b) => {
    const likesA = getTotalLikeCount(a);
    const likesB = getTotalLikeCount(b);
    return likesB - likesA;
  });
};
