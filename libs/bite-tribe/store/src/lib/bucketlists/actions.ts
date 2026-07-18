import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type {
  Bucketlist,
  CreateAndSaveToBucketListParams,
  CreateBucketListFromBiteTrailParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';

export const BucketlistActions = createActionGroup({
  source: 'BUCKETLIST',
  events: {
    'Loaded from API': props<{ bucketlists: Bucketlist[] }>(),
    'Save bite to bucketlist': props<SaveToBucketListParams>(),
    'Saved bite to bucketlist': props<{ bucketlist: Bucketlist }>(),
    'Create and save BiteId to Bucketlist':
      props<CreateAndSaveToBucketListParams>(),
    'Create Bucketlist': props<{ bucketlistName: string }>(),
    'Created Bucketlist': emptyProps(),
    'Remove bite from Bucketlist': props<RemoveBiteFromBucketlistParams>(),
    'Removed bite from Bucketlist': emptyProps(),
    'No Bucketlist found': emptyProps(),
    'Created Bucketlist and saved Bite to it': emptyProps(),
    'Delete Bucketlist': props<{ bucketlistId: string }>(),
    'Deleted Bucketlist': emptyProps(),
    'Update Bucketlist Name': props<{ bucketlistId: string; name: string }>(),
    'Updated Bucketlist Name': emptyProps(),
    'Set Bite Tried Out Status': props<{
      bucketlistId: string;
      biteId: string;
      checked: boolean;
    }>(),
    'Set Bite Tried Out Status Succeeded': emptyProps(),
    'Set Bite Tried Out Status Failed': emptyProps(),
    'Save Bite Trail as Bucket List':
      props<CreateBucketListFromBiteTrailParams>(),
    'Saved Bite Trail as Bucket List': emptyProps(),
  },
});
