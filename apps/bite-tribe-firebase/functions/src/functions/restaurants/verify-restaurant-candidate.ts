import {
  DocumentData,
  Transaction,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { geohashForLocation } from 'geofire-common';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  buildInitialMenuCategories,
  InitialMenuBite,
} from '../shared/utils/initial-menu';

const BITE_COLLECTION = 'bites';
const MENU_COLLECTION = 'menus';
const RESTAURANT_COLLECTION = 'restaurants';
const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';

interface VerifyRestaurantCandidateRequest {
  candidateId?: unknown;
  restaurant?: unknown;
}

interface VerifyRestaurantCandidateResult {
  restaurantId: string;
  menuId?: string;
  menuItemCount?: number;
  candidateId: string;
  status: 'created' | 'already-verified';
}

interface RestaurantPosition {
  latitude: number;
  longitude: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parsePosition = (value: unknown): RestaurantPosition | undefined => {
  if (
    isRecord(value) &&
    isValidCoordinate(value['latitude']) &&
    isValidCoordinate(value['longitude'])
  ) {
    return {
      latitude: value['latitude'],
      longitude: value['longitude'],
    };
  }

  return undefined;
};

const getString = (data: DocumentData, field: string): string =>
  typeof data[field] === 'string' ? data[field] : '';

const isBase64Image = (value: string): boolean =>
  /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);

const toRestaurantDocument = (
  rawRestaurant: unknown,
  menuId: string,
  now: Date,
): DocumentData => {
  if (!isRecord(rawRestaurant)) {
    throw new HttpsError('invalid-argument', 'restaurant must be an object.');
  }

  const name = getString(rawRestaurant, 'name').trim();
  const position = parsePosition(rawRestaurant['position']);

  if (!name) {
    throw new HttpsError('invalid-argument', 'restaurant.name is required.');
  }

  if (!position) {
    throw new HttpsError(
      'invalid-argument',
      'restaurant.position must include latitude and longitude.',
    );
  }

  const image = getString(rawRestaurant, 'image');
  const imagePath =
    getString(rawRestaurant, 'imagePath') ||
    (image && !isBase64Image(image) ? image : '');
  const document: DocumentData = {
    name,
    position,
    geohash: geohashForLocation([position.latitude, position.longitude]),
    menuId,
    createdAt: now.toISOString(),
    createdAtTimestamp: now.getTime(),
    updatedAt: now.toISOString(),
    updatedAtTimestamp: now.getTime(),
  };

  const description = getString(rawRestaurant, 'description');
  if (description) {
    document['description'] = description;
  }

  if (isRecord(rawRestaurant['address'])) {
    document['address'] = rawRestaurant['address'];
  }

  if (Array.isArray(rawRestaurant['socialMediaLinks'])) {
    document['socialMediaLinks'] = rawRestaurant['socialMediaLinks'];
  }

  if (Array.isArray(rawRestaurant['openingHours'])) {
    document['openingHours'] = rawRestaurant['openingHours'];
  }

  if (imagePath) {
    document['imagePath'] = imagePath;
  }

  return document;
};

const getStringArray = (data: DocumentData, field: string): string[] =>
  Array.isArray(data[field])
    ? data[field].filter(
        (value: unknown): value is string => typeof value === 'string',
      )
    : [];

const toInitialMenuBite = (data: DocumentData): InitialMenuBite => ({
  name: typeof data['name'] === 'string' ? data['name'] : undefined,
  price: typeof data['price'] === 'number' ? data['price'] : undefined,
});

const getExistingVerifiedRestaurantId = async (
  transaction: Transaction,
  candidateData: DocumentData,
): Promise<string> => {
  const verifiedRestaurantId = getString(candidateData, 'verifiedRestaurantId');
  if (verifiedRestaurantId) {
    return verifiedRestaurantId;
  }

  const mergedIntoCandidateId = getString(
    candidateData,
    'mergedIntoCandidateId',
  );
  if (!mergedIntoCandidateId) {
    throw new HttpsError(
      'failed-precondition',
      'Restaurant candidate is no longer pending and has no verified restaurant.',
    );
  }

  const mergedIntoCandidate = await transaction.get(
    getFirestore()
      .collection(RESTAURANT_CANDIDATES_COLLECTION)
      .doc(mergedIntoCandidateId),
  );
  const mergedVerifiedRestaurantId = getString(
    mergedIntoCandidate.data() ?? {},
    'verifiedRestaurantId',
  );

  if (!mergedVerifiedRestaurantId) {
    throw new HttpsError(
      'failed-precondition',
      'Merged restaurant candidate has no verified restaurant.',
    );
  }

  return mergedVerifiedRestaurantId;
};

/**
 * Promotes a restaurant candidate into a verified Restaurant.
 *
 * Operator-only. The callable creates a Restaurant, seeds its Menu and links
 * the candidate Bites to it, all with admin credentials, so "any signed-in
 * caller" was enough to let a consumer account mint restaurants from a crafted
 * payload (issue #1472). `verifiedByUserId` records the operator who ran it.
 */
export const verifyRestaurantCandidateHandler = async (
  request: CallableRequest<VerifyRestaurantCandidateRequest>,
): Promise<VerifyRestaurantCandidateResult> => {
  const userId = requireAdmin(request);

  if (
    typeof request.data.candidateId !== 'string' ||
    !request.data.candidateId.trim()
  ) {
    throw new HttpsError('invalid-argument', 'candidateId must be a string.');
  }

  const candidateId = request.data.candidateId.trim();
  const db = getFirestore();
  const candidateRef = db
    .collection(RESTAURANT_CANDIDATES_COLLECTION)
    .doc(candidateId);

  logOperatorAction(request, {
    action: 'verifyRestaurantCandidate',
    targetType: 'restaurantCandidate',
    targetId: candidateId,
    outcome: 'started',
  });

  const result = await db.runTransaction<VerifyRestaurantCandidateResult>(
    async (transaction) => {
      const candidateSnapshot = await transaction.get(candidateRef);

      if (!candidateSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Restaurant candidate was not found.',
        );
      }

      const candidateData = candidateSnapshot.data() ?? {};
      const status = getString(candidateData, 'status');

      if (status !== 'pending') {
        const existingRestaurantId = await getExistingVerifiedRestaurantId(
          transaction,
          candidateData,
        );

        return {
          restaurantId: existingRestaurantId,
          candidateId,
          status: 'already-verified',
        };
      }

      const biteIds = getStringArray(candidateData, 'biteIds');
      const biteSnapshots = biteIds.length
        ? await transaction.getAll(
            ...biteIds.map((biteId) =>
              db.collection(BITE_COLLECTION).doc(biteId),
            ),
          )
        : [];
      // A Bite deleted after clustering must not fail the whole verification,
      // so the candidate cannot get stuck in `pending`.
      const existingBiteSnapshots = biteSnapshots.filter(
        (snapshot) => snapshot.exists,
      );
      const categories = buildInitialMenuCategories(
        existingBiteSnapshots.map((snapshot) =>
          toInitialMenuBite(snapshot.data() ?? {}),
        ),
      );

      const now = new Date();
      const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc();
      const menuRef = db.collection(MENU_COLLECTION).doc();
      const restaurantDocument = toRestaurantDocument(
        request.data.restaurant,
        menuRef.id,
        now,
      );

      transaction.create(restaurantRef, restaurantDocument);
      // The menu names its restaurant. Nothing here reads it back - this
      // transaction runs with the Admin SDK and is not subject to rules - but a
      // menu the client later edits is authorised through the restaurant, and a
      // menu created without the field would be inconsistent with every menu
      // the apps write (issue #1078).
      transaction.create(menuRef, {
        restaurantId: restaurantRef.id,
        categories,
        createdAt: now.toISOString(),
        createdAtTimestamp: now.getTime(),
      });

      existingBiteSnapshots.forEach((snapshot) => {
        transaction.update(snapshot.ref, {
          restaurantId: restaurantRef.id,
          updatedAt: now.toISOString(),
          updatedAtTimestamp: now.getTime(),
        });
      });

      transaction.update(candidateRef, {
        status: 'verified',
        verifiedRestaurantId: restaurantRef.id,
        verifiedAt: now.toISOString(),
        verifiedAtTimestamp: now.getTime(),
        verifiedByUserId: userId,
        updatedAt: now.toISOString(),
        updatedAtTimestamp: now.getTime(),
      });

      return {
        restaurantId: restaurantRef.id,
        menuId: menuRef.id,
        menuItemCount: categories.reduce(
          (total, category) => total + category.items.length,
          0,
        ),
        candidateId,
        status: 'created',
      };
    },
  );

  logOperatorAction(request, {
    action: 'verifyRestaurantCandidate',
    targetType: 'restaurantCandidate',
    targetId: candidateId,
    outcome: 'succeeded',
    details: {
      restaurantId: result.restaurantId,
      menuItemCount: result.menuItemCount,
      status: result.status,
    },
  });

  return result;
};

export const verifyRestaurantCandidate =
  onAppCheck<VerifyRestaurantCandidateRequest>(
    verifyRestaurantCandidateHandler,
  );
