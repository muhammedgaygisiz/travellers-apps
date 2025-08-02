import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bucketlist } from 'model';
import { bucketlistId } from '../router/selectors';

const slice = createFeatureSelector<EntityState<Bucketlist>>(key);

const { selectAll } = adapter.getSelectors();

export const bucketlists = createSelector(slice, selectAll);

export const selectedBucketlist = createSelector(
  bucketlistId,
  bucketlists,
  (id, bucketlists) => bucketlists.find((bucketlist) => bucketlist.id === id)
);

export const selectedBucketlistTitle = createSelector(
  selectedBucketlist,
  (bucketlist) => bucketlist?.name || 'My Bucketlist'
);
