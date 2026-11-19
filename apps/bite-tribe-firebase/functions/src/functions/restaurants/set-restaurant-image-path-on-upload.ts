import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { storageDownloadUrl } from '../shared/utils/storage-download-url';
import {
  createdAtMs,
  deleteReplacedObjects,
} from '../shared/utils/delete-replaced-objects';

// Matches: images/restaurants/{restaurantId}/{filename}
const RESTAURANT_IMAGE_PATH_REGEX = /^images\/restaurants\/([^/]+)\/[^/]+$/;

/**
 * Points a restaurant at its new photo once the upload finalizes, and removes
 * the photo it replaced (GitHub issue #2126).
 *
 * The restaurant photo's `setUserPhotoUrlOnUpload`: the uploading device in
 * the business app writes the same URL itself for an immediate update, but an
 * upload outlives the page that started it, so this is what makes it land.
 * Like the profile trigger it clears the `pending` status the client set.
 *
 * The admin app's candidate verification uploads here too and writes the URL
 * itself; this then writes the same URL again, which changes nothing.
 */
export const setRestaurantImagePathOnUpload = onObjectFinalized(
  async (event) => {
    const objectPath = event.data.name;

    if (!objectPath) {
      return;
    }

    const match = objectPath.match(RESTAURANT_IMAGE_PATH_REGEX);

    if (!match) {
      return;
    }

    const restaurantId = match[1];
    const restaurantRef = getFirestore().doc(`restaurants/${restaurantId}`);
    const restaurantSnap = await restaurantRef.get();

    if (!restaurantSnap.exists) {
      logger.warn(
        `setRestaurantImagePathOnUpload: restaurant ${restaurantId} does not exist`,
      );
      return;
    }

    const imagePath = await storageDownloadUrl(event.data.bucket, objectPath);

    await restaurantRef.update({
      imagePath,
      imageStatus: 'uploaded',
    });

    await deleteReplacedObjects({
      bucketName: event.data.bucket,
      prefix: `images/restaurants/${restaurantId}/`,
      objectPath,
      finalizedAt: createdAtMs(event.data.timeCreated),
      caller: 'setRestaurantImagePathOnUpload',
    });

    logger.info(
      `setRestaurantImagePathOnUpload: imagePath set for restaurant ${restaurantId}`,
    );
  },
);
