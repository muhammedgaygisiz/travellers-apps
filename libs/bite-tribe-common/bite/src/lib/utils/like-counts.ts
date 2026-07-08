import type { Bite, LikeType } from 'model';

export type { LikeType };

export type LikeCounts = Record<LikeType, number>;

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

export const getLikeCounts = (bite: Bite | null | undefined): LikeCounts => ({
  thumbup: getLikeCount(bite, 'thumbup'),
  drooling: getLikeCount(bite, 'drooling'),
  mindblown: getLikeCount(bite, 'mindblown'),
});

export const getUserLikeType = (
  bite: Bite | null | undefined,
  userId: string | undefined,
): LikeType | undefined => {
  if (!userId) {
    return undefined;
  }

  return bite?.likes?.find((like) => like.userId === userId)?.likeType;
};
