import type { Bite, Like } from 'model';

export type LikeType = Like['likeType'];

export const likeTypes: LikeType[] = ['thumbup', 'drooling', 'mindblown'];

export const getLikeCount = (
  bite: Bite | null | undefined,
  likeType: LikeType,
): number => bite?.[likeType] ?? 0;

export const getTotalLikeCount = (bite: Bite | null | undefined): number => {
  return likeTypes.reduce(
    (total, likeType) => total + getLikeCount(bite, likeType),
    0,
  );
};
