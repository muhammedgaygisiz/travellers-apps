import type { Bite, Like } from 'model';

export type LikeType = Like['likeType'];

export const likeTypes: LikeType[] = ['thumbup', 'drooling', 'mindblown'];

export const hasAggregateLikeCounts = (
  bite: Bite | null | undefined,
): boolean =>
  likeTypes.some((likeType) => typeof bite?.[likeType] === 'number');

export const getLikeCount = (
  bite: Bite | null | undefined,
  likeType: LikeType,
): number => {
  const aggregateCount = bite?.[likeType];

  if (typeof aggregateCount === 'number') {
    return aggregateCount;
  }

  return bite?.likes?.filter((like) => like.likeType === likeType).length || 0;
};

export const getTotalLikeCount = (bite: Bite | null | undefined): number => {
  if (hasAggregateLikeCounts(bite)) {
    return likeTypes.reduce(
      (total, likeType) => total + getLikeCount(bite, likeType),
      0,
    );
  }

  return bite?.likes?.length || 0;
};
