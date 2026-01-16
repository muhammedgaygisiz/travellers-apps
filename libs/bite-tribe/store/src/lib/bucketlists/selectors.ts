import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import type { Bucketlist } from 'model';
import { bucketlistId } from '../router/selectors';
import { bucketlistSorting } from '../filtering-and-sorting/selectors';
import { sortByCriteria } from './utils/sort-by-criteria';

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

export const sortedBucketlists = createSelector(
  bucketlists,
  bucketlistSorting,
  (bucketlists, sorting) => sortByCriteria(bucketlists, sorting),
);
