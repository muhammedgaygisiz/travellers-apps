import { Bite } from 'model';
import { replaceImageInFirestoreStorage } from './replace-image-in-firestorestorage';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from '../../utils/constants';
import { toBite } from '../../utils/to-bite';
import { uploadImageAndUpdateBite } from './upload-image-and-update-bite';
import { withoutPublishedImageFields } from './without-published-image-fields';

/**
 * Saves an edit of a Bite. The photo's own fields - `imagePath`,
 * `imageStatus` and `imageRefusalCategory` - are never part of the write:
 * `setBiteImagePathOnUpload` alone writes them (GitHub issue #2139), and an
 * edit holding a stale copy must not overwrite what it decided.
 */
export const saveEditedBite = async (
  isWeb: boolean,
  bite: Bite,
): Promise<void> => {
  void isWeb;
  if (bite.imagePath && bite.image) {
    const { image, ...biteWithoutImage } = bite;
    void image;

    await replaceImageInFirestoreStorage(
      image,
      bite.imagePath,
      bite.id,
      biteWithoutImage,
    );

    return;
  }

  if (bite.imagePath && !bite.image) {
    const { image, ...biteWithoutImage } = bite;
    void image;

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${bite.id}`,
      data: {
        ...withoutPublishedImageFields(biteWithoutImage),
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    return;
  }

  if (!bite.imagePath && bite.image) {
    const doc = await FirebaseFirestore.getDocument({
      reference: `${BITE_COLLECTION}/${bite.id}`,
    });
    const originalBite = toBite(doc.snapshot);
    const originalImagePath = originalBite.imagePath;

    if (originalImagePath) {
      const { image, ...biteWithoutImage } = bite;

      await replaceImageInFirestoreStorage(image, originalImagePath, bite.id, {
        ...biteWithoutImage,
      });

      return;
    }

    // Bite created in old style only with base64 image
    // so we do not have a imagePath yet
    const { image, imagePath, ...biteWithoutImage } = bite;
    void imagePath;
    await uploadImageAndUpdateBite({
      imageBase64: image,
      biteId: bite.id,
      biteWithoutImage,
      clearBase64Image: true,
    });

    return;
  }

  await FirebaseFirestore.updateDocument({
    reference: `${BITE_COLLECTION}/${bite.id}`,
    data: {
      ...withoutPublishedImageFields(bite),
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
    },
  });
};
