import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { BITE_TRAIL_PHOTO } from '../shared/moderation/checked-image-subjects';
import { publishCheckedFolderPhoto } from '../shared/moderation/publish-checked-folder-photo';

// Matches: images/biteTrails/{biteTrailId}/{filename}
const BITE_TRAIL_IMAGE_PATH_REGEX = /^images\/biteTrails\/([^/]+)\/[^/]+$/;

/**
 * Publishes a Bite Trail's photo once its upload finalizes and the image check
 * has passed it (GitHub issue #2141). See {@link publishCheckedFolderPhoto}
 * for what each verdict writes.
 *
 * Before this the business app wrote the download URL itself the moment the
 * upload finished, and the photo was public with nothing on the backend having
 * seen it.
 */
export const setBiteTrailImagePathOnUpload = onObjectFinalized((event) =>
  publishCheckedFolderPhoto({
    object: event.data,
    pathPattern: BITE_TRAIL_IMAGE_PATH_REGEX,
    subject: BITE_TRAIL_PHOTO,
    caller: 'setBiteTrailImagePathOnUpload',
  }),
);
