import { EntityState } from '@ngrx/entity';
import type { Bucketlist } from 'model';
import { adapter } from '../adapter';

/**
 * Writes a Bite's tried-out status into the cached Bucket List.
 *
 * It mirrors what `BucketlistApiService.updateBucketlistTriedOutStatus` writes
 * to Firestore, so the list can be ticked off optimistically and read the same
 * before and after the remote write answers.
 */
export const applyTriedOutStatus = (
  state: EntityState<Bucketlist>,
  params: { bucketlistId: string; biteId: string; checked: boolean },
): EntityState<Bucketlist> => {
  const { bucketlistId, biteId, checked } = params;
  const bucketlist = state.entities[bucketlistId];

  if (!bucketlist) {
    return state;
  }

  const withoutBite = (bucketlist.triedOutBites ?? []).filter(
    (triedOutBite) => triedOutBite.biteId !== biteId,
  );

  const now = new Date();
  const triedOutBites = checked
    ? [
        ...withoutBite,
        { biteId, date: now.toISOString(), timestamp: now.getTime() },
      ]
    : withoutBite;

  return adapter.updateOne(
    { id: bucketlistId, changes: { triedOutBites } },
    state,
  );
};
