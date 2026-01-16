import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type {
  CreateAndSaveToBucketListParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';

export const BucketlistActions = createActionGroup({
  source: 'BUCKETLIST',
  events: {
    'Loaded from API': props<{ bucketlists: any }>(),
    'Save bite to bucketlist': props<SaveToBucketListParams>(),
    'Create and save BiteId to Bucketlist':
      props<CreateAndSaveToBucketListParams>(),
    'Create Bucketlist': props<{ bucketlistName: string }>(),
    'Remove bite from Bucketlist': props<RemoveBiteFromBucketlistParams>(),
    'No Bucketlist found': emptyProps(),
  },
});
