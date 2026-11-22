import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { RESTAURANT_PHOTO } from '../shared/moderation/checked-image-subjects';
import { publishCheckedFolderPhoto } from '../shared/moderation/publish-checked-folder-photo';

// Matches: images/restaurants/{restaurantId}/{filename}
const RESTAURANT_IMAGE_PATH_REGEX = /^images\/restaurants\/([^/]+)\/[^/]+$/;

/**
 * Publishes a restaurant's new photo once its upload finalizes and the image
 * check has passed it, and removes the photo it replaced (GitHub issues #2126
 * and #2141). See {@link publishCheckedFolderPhoto} for what each verdict
 * writes.
 *
 * The only writer of the restaurant's `imagePath` after an upload, with the
 * scheduled recheck that applies the same verdicts (#2142): neither the
 * business app's photo editor nor the admin app's new-restaurant page writes
 * the download URL any more. Candidate verification still hands its URL to
 * `verifyRestaurantCandidate`, which writes it inside its transaction; that
 * photo is uploaded under the candidate id, which names no restaurant, so it
 * is not checked here.
 */
export const setRestaurantImagePathOnUpload = onObjectFinalized((event) =>
  publishCheckedFolderPhoto({
    object: event.data,
    pathPattern: RESTAURANT_IMAGE_PATH_REGEX,
    subject: RESTAURANT_PHOTO,
    caller: 'setRestaurantImagePathOnUpload',
  }),
);
