import { Bite, Like } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const LIKE_COLLECTION_GROUP = 'likes';

/**
 * Loads the current user's likes for the given Bites in one collection-group
 * query.
 *
 * Likes live in a subcollection per Bite, so reading them per Bite meant one
 * document read - and one Capacitor bridge round trip - for each Bite in the
 * feed. The feed hands this every Bite it holds and re-runs it on each feed
 * load and every 100m of movement, so in a dense city that was 500+ reads a
 * time. Each like document carries its own `userId`, which the collection-group
 * index in `firestore.indexes.json` is built for, so a single query returns
 * exactly this user's likes regardless of how large the feed is.
 *
 * The result is narrowed back to the Bites that were asked for, so callers see
 * what they always saw. See GitHub issue #1357.
 */
export const loadLikesByBites = async (
  bites: Bite[],
  userId: string,
): Promise<Like[]> => {
  const biteIds = new Set(bites.map((bite) => bite.id).filter(Boolean));

  // No Bites means nothing to match against, and the query would be a read
  // spent on a result that is discarded.
  if (biteIds.size === 0) {
    return [];
  }

  const { snapshots } = await FirebaseFirestore.getCollectionGroup({
    reference: LIKE_COLLECTION_GROUP,
    compositeFilter: {
      type: 'and',
      queryConstraints: [
        { type: 'where', fieldPath: 'userId', opStr: '==', value: userId },
      ],
    },
  });

  return snapshots
    .map((snapshot) => snapshot.data as Like | null)
    .filter((like): like is Like => !!like && biteIds.has(like.biteId));
};
