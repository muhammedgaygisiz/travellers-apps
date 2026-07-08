import { Bite, Like } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const loadLikesByBites = (
  bites: Bite[],
  userId: string,
): Promise<Like[]> => {
  const biteIds = bites.map((bite) => bite.id).filter(Boolean);

  const likePromises = biteIds.map(async (biteId) => {
    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: `bites/${biteId}/likes/${userId}`,
    });

    return snapshot.data ? [snapshot.data as Like] : [];
  });

  return Promise.all(likePromises).then((likesArrays) => likesArrays.flat());
};
