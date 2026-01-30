import { Bite, Like } from 'model';
import {
  DocumentData,
  DocumentSnapshot,
  FirebaseFirestore,
} from '@capacitor-firebase/firestore';

export const loadLikesByBites = (bites: Bite[]): Promise<Like[]> => {
  const biteIds = bites.map((bite) => bite.id).filter(Boolean);

  const likePromises = biteIds.map(async (biteId) => {
    const likeDocs = await FirebaseFirestore.getCollection({
      reference: `bites/${biteId}/likes`,
    });

    return likeDocs.snapshots.map(
      (likeDoc: DocumentSnapshot<DocumentData>) =>
        ({
          ...likeDoc.data,
        }) as Like,
    );
  });

  return Promise.all(likePromises).then((likesArrays) => likesArrays.flat());
};
