import type { Bite, LikeType } from 'model';
import { adapter, BitesState } from '../adapter';

export type LikeCountDeltas = Partial<Record<LikeType, number>>;

const applyDeltas = (bite: Bite, deltas: LikeCountDeltas): Bite => {
  const updated = { ...bite };

  for (const [likeType, delta] of Object.entries(deltas) as [
    LikeType,
    number,
  ][]) {
    updated[likeType] = Math.max((bite[likeType] ?? 0) + delta, 0);
  }

  return updated;
};

const adjustInList = (
  bites: Bite[],
  biteId: string,
  deltas: LikeCountDeltas,
): Bite[] => {
  if (!bites.some((bite) => bite.id === biteId)) {
    return bites;
  }

  return bites.map((bite) =>
    bite.id === biteId ? applyDeltas(bite, deltas) : bite,
  );
};

export const adjustBiteLikeCounts = (
  state: BitesState,
  biteId: string,
  deltas: LikeCountDeltas,
): BitesState => {
  let nextState = state;

  const entity = state.entities[biteId];
  if (entity) {
    nextState = adapter.upsertOne(applyDeltas(entity, deltas), nextState);
  }

  return {
    ...nextState,
    latestBites: adjustInList(nextState.latestBites, biteId, deltas),
    bitesByUserId: adjustInList(nextState.bitesByUserId, biteId, deltas),
    bitesByBucketlist: adjustInList(
      nextState.bitesByBucketlist,
      biteId,
      deltas,
    ),
  };
};
