import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BitesState } from './adapter';
import { key } from './key';
import { likes } from '../likes/selectors';
import { gpsPosition } from '../app/selectors';
import { groupLikesByBiteId } from './utils/group-likes-by-bite-id';
import { createBiteMetadataJoin } from './utils/join-bite-metadata';
import { byDistance } from './utils/by-distance';
import { selectedBucketlist } from '../bucketlists/selectors';

/** Own cache per feed, so one feed's churn cannot evict another's. */
const joinBucketlistBiteMetadata = createBiteMetadataJoin();

const slice = createFeatureSelector<BitesState>(key);

const bitesByBucketlistSlice = createSelector(
  slice,
  (state) => state.bitesByBucketlist,
);

export const bitesByBucketlistWithMetadata = createSelector(
  bitesByBucketlistSlice,
  likes,
  gpsPosition,
  (bites, likes, gpsPosition) => {
    return joinBucketlistBiteMetadata(
      bites,
      groupLikesByBiteId(likes),
      gpsPosition,
    ).sort(byDistance);
  },
);

export const bitesByBucketlist = createSelector(
  bitesByBucketlistWithMetadata,
  selectedBucketlist,
  (bites, selectedBucketlist) => {
    if (!selectedBucketlist) {
      return [];
    }

    return bites.filter((bite) =>
      selectedBucketlist.biteIds?.includes(bite.id),
    );
  },
);
