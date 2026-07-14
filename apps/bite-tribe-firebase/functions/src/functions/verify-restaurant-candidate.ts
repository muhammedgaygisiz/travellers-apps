import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { geohashForLocation } from 'geofire-common';
import { onAppCheck } from './callable-options';

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

const getString = (
  data: admin.firestore.DocumentData,
  field: string,
): string => (typeof data[field] === 'string' ? data[field] : '');

const isBase64Image = (value: string): boolean =>
  /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);

const toRestaurantDocument = (
  rawRestaurant: unknown,
  menuId: string,
  now: Date,
): admin.firestore.DocumentData => {
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
  const document: admin.firestore.DocumentData = {
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

const getStringArray = (
  data: admin.firestore.DocumentData,
  field: string,
): string[] =>
  Array.isArray(data[field])
    ? data[field].filter(
        (value: unknown): value is string => typeof value === 'string',
      )
    : [];

const getExistingVerifiedRestaurantId = async (
  transaction: admin.firestore.Transaction,
  candidateData: admin.firestore.DocumentData,
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
    admin
      .firestore()
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

export const verifyRestaurantCandidateHandler = async (
  request: CallableRequest<VerifyRestaurantCandidateRequest>,
): Promise<VerifyRestaurantCandidateResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to verify restaurant candidates.',
    );
  }

  if (
    typeof request.data.candidateId !== 'string' ||
    !request.data.candidateId.trim()
  ) {
    throw new HttpsError('invalid-argument', 'candidateId must be a string.');
  }

  const candidateId = request.data.candidateId.trim();
  const userId = request.auth.uid;
  const db = admin.firestore();
  const candidateRef = db
    .collection(RESTAURANT_CANDIDATES_COLLECTION)
    .doc(candidateId);

  logger.info('restaurant candidate verification started', { candidateId });

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

      const now = new Date();
      const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc();
      const menuRef = db.collection(MENU_COLLECTION).doc();
      const restaurantDocument = toRestaurantDocument(
        request.data.restaurant,
        menuRef.id,
        now,
      );
      const biteIds = getStringArray(candidateData, 'biteIds');

      transaction.create(restaurantRef, restaurantDocument);
      transaction.create(menuRef, {
        categories: [],
        createdAt: now.toISOString(),
        createdAtTimestamp: now.getTime(),
      });

      biteIds.forEach((biteId) => {
        transaction.update(db.collection(BITE_COLLECTION).doc(biteId), {
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
        candidateId,
        status: 'created',
      };
    },
  );

  logger.info('restaurant candidate verification finished', {
    candidateId,
    restaurantId: result.restaurantId,
    status: result.status,
  });

  return result;
};

export const verifyRestaurantCandidate =
  onAppCheck<VerifyRestaurantCandidateRequest>(
    verifyRestaurantCandidateHandler,
  );
