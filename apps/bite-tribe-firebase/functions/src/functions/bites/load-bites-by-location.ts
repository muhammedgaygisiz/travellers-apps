import {
  DocumentData,
  QueryDocumentSnapshot,
  getFirestore,
} from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { distanceBetween, geohashQueryBounds, Geopoint } from 'geofire-common';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { isBiteVisibleTo } from '../shared/utils/bite-listability';

const BITE_COLLECTION = 'bites';
const LIKE_SUBCOLLECTION = 'likes';
const LIKE_READ_BATCH_SIZE = 300;
/**
 * How far "nearby" reaches.
 *
 * Every Bite inside this radius is read, and read again for the caller's like,
 * whether or not the user ever scrolls to it: a single position at 15km
 * returned 491 Bites against a feed that renders 50 at a time. Narrowing the
 * horizon is the only lever that reduces the Bite reads themselves, because the
 * geohash bounds have to come back before any distance can be compared. See
 * GitHub issue #1294 for the staged search that replaces a fixed radius
 * altogether.
 */
const DEFAULT_SEARCH_RADIUS_IN_M = 10 * 1000;

interface LoadBitesByLocationRequest {
  latitude?: unknown;
  longitude?: unknown;
}

export interface LocationBite extends DocumentData {
  id: string;
  likes: unknown[];
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const querySingleBound = async (
  bound: [string, string],
): Promise<QueryDocumentSnapshot[]> => {
  try {
    const snapshot = await getFirestore()
      .collection(BITE_COLLECTION)
      .where('geohash', '>=', bound[0])
      .where('geohash', '<=', bound[1])
      .orderBy('geohash', 'asc')
      .get();

    return snapshot.docs;
  } catch {
    return [];
  }
};

const toLocationBite = (doc: QueryDocumentSnapshot): LocationBite => ({
  ...doc.data(),
  id: doc.id,
  likes: [],
});

const getPosition = (
  bite: LocationBite,
): { latitude: number; longitude: number } | undefined => {
  const position = bite.position;

  if (
    position &&
    isValidCoordinate(position.latitude) &&
    isValidCoordinate(position.longitude)
  ) {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
    };
  }

  return undefined;
};

/**
 * The Bites of one geohash read that belong in the caller's feed: inside the
 * radius, and visible to them.
 *
 * Visibility is settled here, in the pass that already drops what the geohash
 * bounds over-read, rather than in the query - see `bite-listability.ts`. It
 * also runs before {@link attachCallerLikes}, so a hidden Bite costs no like
 * read. A Bite whose photo never arrived reaches its own poster and nobody
 * else (GitHub issue #1717).
 */
export const selectNearbyBites = (
  bites: LocationBite[],
  center: Geopoint,
  viewerUid: string,
): LocationBite[] =>
  bites.filter((bite) => {
    if (!isBiteVisibleTo(bite as DocumentData, viewerUid)) {
      return false;
    }

    const position = getPosition(bite);

    if (!position) {
      return false;
    }

    const distanceInKm = distanceBetween(
      [position.latitude, position.longitude],
      center,
    );
    const distanceInM = distanceInKm * 1000;

    return distanceInM <= DEFAULT_SEARCH_RADIUS_IN_M;
  });

/**
 * Attaches the caller's own like to each Bite.
 *
 * The client used to fetch this itself, after the feed had already been
 * rendered, so for several seconds every Bite the user had liked came up
 * looking unliked - which reads as a lost like rather than a pending load. The
 * feed already knows who is asking, so the likes travel with it instead.
 *
 * The lookup is a batched read of exactly the like documents these Bites would
 * have, rather than a query for everything this user ever liked. Both answer
 * the same question, but only this one stays bounded by the size of the feed:
 * a user with thousands of likes would otherwise pay for all of them on every
 * single feed load. Aggregate counts stay on the Bite document; this settles
 * only what the caller themselves reacted with.
 *
 * A failure here must not cost the user their feed: the Bites come back without
 * likes and the client still renders them. See GitHub issue #1357.
 */
export const attachCallerLikes = async (
  bites: LocationBite[],
  userId: string,
): Promise<LocationBite[]> => {
  if (bites.length === 0) {
    return bites;
  }

  try {
    const firestore = getFirestore();
    const references = bites.map((bite) =>
      firestore.doc(
        `${BITE_COLLECTION}/${bite.id}/${LIKE_SUBCOLLECTION}/${userId}`,
      ),
    );

    const likesByBiteId = new Map<string, DocumentData[]>();

    // Chunked so one very large feed cannot become a single oversized read,
    // and issued together rather than one after another: the feed waits for
    // the slowest batch instead of the sum of all of them.
    const batches = [];

    for (let i = 0; i < references.length; i += LIKE_READ_BATCH_SIZE) {
      batches.push(
        firestore.getAll(...references.slice(i, i + LIKE_READ_BATCH_SIZE)),
      );
    }

    const documents = (await Promise.all(batches)).flat();

    for (const document of documents) {
      // The parent Bite owns the id, so a like whose document lost its own
      // `biteId` still lands on the right Bite.
      const biteId = document.ref.parent.parent?.id;

      if (document.exists && biteId) {
        likesByBiteId.set(biteId, [document.data() as DocumentData]);
      }
    }

    return bites.map((bite) => ({
      ...bite,
      likes: likesByBiteId.get(bite.id) ?? [],
    }));
  } catch {
    return bites;
  }
};

export const loadBitesByLocation = onAppCheck<LoadBitesByLocationRequest>(
  async (request) => {
    requireMember(request, 'You must be signed in to load nearby bites.');

    const { latitude, longitude } = request.data;

    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      throw new HttpsError(
        'invalid-argument',
        'latitude and longitude must be numbers.',
      );
    }

    const center: Geopoint = [latitude, longitude];
    const bounds = geohashQueryBounds(center, DEFAULT_SEARCH_RADIUS_IN_M);
    const snapshots = await Promise.all(bounds.map(querySingleBound));

    return attachCallerLikes(
      selectNearbyBites(
        snapshots.flat().map(toLocationBite),
        center,
        request.auth.uid,
      ),
      request.auth.uid,
    );
  },
);
