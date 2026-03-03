import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BitesState } from './adapter';
import { key } from './key';
import { likes } from '../likes/selectors';
import { gpsPosition } from '../app/selectors';
import { getLikesForBite } from './utils/get-likes-for-bite';
import { haversineDistance } from 'utils';
import type { Bite } from 'model';
import { byDistance } from './utils/by-distance';
import { selectedBucketlist } from '../bucketlists/selectors';

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
    return bites
      .map(
        (bite) =>
          ({
            ...bite,
            likes: getLikesForBite(likes, bite),
            distance: haversineDistance(
              bite.position?.latitude,
              bite.position?.longitude,
              gpsPosition?.latitude,
              gpsPosition?.longitude,
              'km',
            ),
          }) as Bite,
      )
      .sort(byDistance);
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
