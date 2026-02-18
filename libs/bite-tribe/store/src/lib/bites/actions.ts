import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Bite, UploadParams } from 'model';

export const BiteActions = createActionGroup({
  source: 'BITES',
  events: {
    'Loaded By GPS Position from API': props<{ bites: Bite[] }>(),
    'Loaded By User From API': props<{ bites: Bite[] }>(),
    'Loaded By Bucketlist From API': props<{ bites: Bite[] }>(),
    'Save new bite': props<{ bite: Bite }>(),
    'Save existing bite': props<{ bite: Bite }>(),
    'Saved bite': props<{ bite: Bite }>(),
    'Error saving bite': props<{ bite: Bite }>(),
    'Cache bite': props<{ bite: Partial<Bite> }>(),
    'Set editing bite': props<{ bite: Partial<Bite> }>(),
    'Delete bite': props<{ bite: Bite }>(),
    'Deleted bite': props<{ bite: Bite }>(),
    'Error deleting bite': props<{ bite: Bite }>(),
    'No public creator for bite': emptyProps(),
    'No bites for bite creator profile': emptyProps(),
    'Loaded Latest from API': props<{ bites: Bite[] }>(),
    'Upload Image': props<{ bite: Bite }>(),
    'Uploading Image': props<{
      progress: UploadParams;
      biteId: string;
      imagePath: string;
    }>(),
    'Uploaded Image': props<{ bite: Bite; imagePath: string }>(),
    'Error uploading image': props<{ bite: Bite }>(),
    'Updated Image Path in Bite': props<{ bite: Bite }>(),
    'Error updating image path in Bite': props<{ bite: Bite }>(),
  },
});
