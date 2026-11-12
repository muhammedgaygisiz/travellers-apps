import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { BiteAuthorPrivate, Geopoint } from 'model';
import { BITE_COLLECTION } from '../../utils/constants';

/** The author-only subcollection under a Bite (GitHub issue #1290). */
export const BITE_AUTHOR_PRIVATE_COLLECTION = 'authorPrivate';

const authorPrivateReference = (biteId: string, userId: string): string =>
  `${BITE_COLLECTION}/${biteId}/${BITE_AUTHOR_PRIVATE_COLLECTION}/${userId}`;

/**
 * Stores the photo's position where only the author can read it, or removes it
 * when the Bite's photo no longer has one.
 *
 * Only latitude and longitude are written: the rules refuse any other field,
 * and a candidate `Geopoint` can carry an `id`.
 */
export const saveBitePhotoPosition = async (
  biteId: string,
  userId: string,
  photoPosition: Geopoint | null,
): Promise<void> => {
  const reference = authorPrivateReference(biteId, userId);

  if (!photoPosition) {
    await FirebaseFirestore.deleteDocument({ reference });
    return;
  }

  const data: BiteAuthorPrivate = {
    userId,
    photoPosition: {
      latitude: photoPosition.latitude,
      longitude: photoPosition.longitude,
    },
  };

  await FirebaseFirestore.setDocument({ reference, data: { ...data } });
};

/** The photo's position the author stored for this Bite, if any. */
export const loadBitePhotoPosition = async (
  biteId: string,
  userId: string,
): Promise<Geopoint | undefined> => {
  const { snapshot } = await FirebaseFirestore.getDocument<BiteAuthorPrivate>({
    reference: authorPrivateReference(biteId, userId),
  });

  const position = snapshot.data?.photoPosition;

  return position
    ? { latitude: position.latitude, longitude: position.longitude }
    : undefined;
};
