import { Bite } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { geohashForLocation } from 'geofire-common';
import { BITE_COLLECTION } from '../../utils/constants';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const createBite = async (
  biteDoc: Omit<Bite, 'image'>,
  user: User | null | undefined,
): Promise<string> => {
  const gh = geohashForLocation([
    biteDoc.position.latitude,
    biteDoc.position.longitude,
  ]);

  const doc = await FirebaseFirestore.addDocument({
    reference: BITE_COLLECTION,
    data: {
      ...biteDoc,
      geohash: gh,
      userId: user?.uid || '',
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
    },
  });

  return doc.reference.id;
};
