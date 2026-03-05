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
    'Removed bite from Bucketlist': emptyProps(),
    'No Bucketlist found': emptyProps(),
    'Created Bucketlist and saved Bite to it': emptyProps(),
    'Delete Bucketlist': props<{ bucketlistId: string }>(),
    'Deleted Bucketlist': emptyProps(),
    'Update Bucketlist Name': props<{ bucketlistId: string; name: string }>(),
    'Updated Bucketlist Name': emptyProps(),
  },
});
