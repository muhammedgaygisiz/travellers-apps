import { Bite } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { geohashForLocation } from 'geofire-common';
import { BITE_COLLECTION } from '../../utils/constants';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { v4 as uuid } from 'uuid';

export const createBite = (
  biteDoc: Omit<Bite, 'image'>,
  user: User | null | undefined,
): string => {
  const gh = geohashForLocation([
    biteDoc.position.latitude,
    biteDoc.position.longitude,
  ]);

  /**
   * We need to create the doc id locally to be able to reference it
   * when uploading the image to Firebase Storage.
   *
   * We cannot rely on the promise since it does not resolve when offline.
   */
  const id = uuid();
  FirebaseFirestore.setDocument({
    reference: `${BITE_COLLECTION}/${id}`,
    data: {
      ...biteDoc,
      geohash: gh,
      userId: user?.uid || '',
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
    },
  });

  return id;
};
