import { createAction, props } from '@ngrx/store';
import {
  CreateAndSaveToBucketListParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';

export const loadedBucketlistsFromApi = createAction(
  '[BUCKETLISTS] Loaded from API',
  props<{ bucketlists: any }>()
);

export const saveBiteIdToBucketList = createAction(
  '[BUCKETLISTS] Save bite to bucketlist',
  props<SaveToBucketListParams>()
);

export const createAndSaveBiteIdToBucketList = createAction(
  '[BUCKETLISTS] Create bucketlist and save bite to it',
  props<CreateAndSaveToBucketListParams>()
);

export const removeBiteFromBucketlist = createAction(
  '[BUCKETLISTS] Remove bite from bucketlist',
  props<RemoveBiteFromBucketlistParams>()
);
