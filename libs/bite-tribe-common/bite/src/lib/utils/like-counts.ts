import type { Bite, LikeType } from 'model';

export type { LikeType };

export type LikeCounts = Record<LikeType, number>;

export const likeTypes: LikeType[] = ['thumbup', 'drooling', 'mindblown'];

const getAggregateLikeCount = (
  bite: Bite | null | undefined,
  likeType: LikeType,
): number => bite?.[likeType] ?? 0;

const getKnownLikeCount = (
  bite: Bite | null | undefined,
  likeType: LikeType,
): number =>
  bite?.likes?.filter((like) => like?.likeType === likeType).length ?? 0;

/**
 * The `thumbup`, `drooling` and `mindblown` fields are aggregates maintained by
 * a Firestore trigger, so they lag behind reactions the client already knows
 * about: an own reaction that was just written optimistically, or an old Bite
 * document whose aggregates were never migrated. Taking the higher of the
 * aggregate and the loaded likes keeps the counter visible instead of letting
 * it fall back to 0.
 */
export const getLikeCount = (
  bite: Bite | null | undefined,
  likeType: LikeType,
): number =>
  Math.max(
    getAggregateLikeCount(bite, likeType),
    getKnownLikeCount(bite, likeType),
  );

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
