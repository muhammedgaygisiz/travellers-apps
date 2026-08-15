import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import type { Bucketlist } from 'model';
import { bucketlistId } from '../router/selectors';
import { sortBucketlistsByName } from './utils/sort-bucketlists-by-name';

const slice = createFeatureSelector<EntityState<Bucketlist>>(key);

const { selectAll } = adapter.getSelectors();

export const bucketlists = createSelector(slice, selectAll);

export const selectedBucketlist = createSelector(
  bucketlistId,
  bucketlists,
  (id, bucketlists) => bucketlists.find((bucketlist) => bucketlist.id === id),
);

export const selectedBucketlistTitle = createSelector(
  selectedBucketlist,
  (bucketlist) => bucketlist?.name || 'My Bucketlist',
);

/**
 * Bucket lists are always ordered by name. They are looked up by name rather
 * than browsed chronologically, so the page offers a name filter instead of a
 * sort control. See GitHub issue #1329.
 */
export const sortedBucketlists = createSelector(bucketlists, (bucketlists) =>
  sortBucketlistsByName(bucketlists),
);
