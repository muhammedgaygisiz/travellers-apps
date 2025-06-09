import { createAction, props } from '@ngrx/store';
import { SaveToBucketListParams } from 'model';

export const loadedBucketlistsFromApi = createAction(
  '[BUCKETLISTS] Loaded from API',
  props<{ bucketlists: any }>()
);

export const saveBiteIdToBucketList = createAction(
  '[BUCKETLISTS] Save bite to bucketlist',
  props<SaveToBucketListParams>()
);
