import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type {
  Bucketlist,
  CreateAndSaveToBucketListParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';

export const BucketlistActions = createActionGroup({
  source: 'BUCKETLIST',
  events: {
    'Loaded from API': props<{ bucketlists: any }>(),
    'Save bite to bucketlist': props<SaveToBucketListParams>(),
    'Saved bite to bucketlist': props<{ bucketlist: Bucketlist }>(),
    'Create and save BiteId to Bucketlist':
      props<CreateAndSaveToBucketListParams>(),
    'Create Bucketlist': props<{ bucketlistName: string }>(),
    'Remove bite from Bucketlist': props<RemoveBiteFromBucketlistParams>(),
    'No Bucketlist found': emptyProps(),
  },
});
