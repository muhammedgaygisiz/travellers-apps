import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { DocumentData } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/firestore';
import { geohashForLocation } from 'geofire-common';
import { RESTAURANT_COLLECTION } from './restaurant-authority';

/** A position the geohash can be computed from, or nothing. */
const validPosition = (
  data: DocumentData | undefined,
): { latitude: number; longitude: number } | undefined => {
  const position = data?.['position'];
  const latitude = position?.latitude;
  const longitude = position?.longitude;

  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : undefined;
};

/**
 * The `geohash` a restaurant document should carry, or `undefined` for one
 * whose position cannot place it. Exported for its spec.
 */
export const geohashFor = (
  data: DocumentData | undefined,
): string | undefined => {
  const position = validPosition(data);

  return position
    ? geohashForLocation([position.latitude, position.longitude])
    : undefined;
};

/**
 * Keeps a restaurant's `geohash` in step with its `position` (GitHub issue
 * #2308), whoever wrote it: candidate verification sets both, but the owner's
 * position section, the admin app and seed scripts write the position alone,
 * and a restaurant that moves keeps its old geohash.
 *
 * Create Bite finds restaurants near the guest by geohash range, so a
 * restaurant without one, or with a stale one, cannot be picked by name. Only a
 * difference is written, so the trigger's own write - which fires it again -
 * changes nothing and stops there. A position that cannot place the restaurant
 * removes the geohash rather than leaving one pointing elsewhere.
 */
export const keepRestaurantGeohash = onDocumentWritten(
  `${RESTAURANT_COLLECTION}/{restaurantId}`,
  async (event) => {
    const after = event.data?.after;

    if (after?.exists) {
      await syncRestaurantGeohash(after.id, after.data());
    }
  },
);

/**
 * Writes the geohash `data` should carry, when it differs from the stored one.
 * Exported for its spec; returns whether it wrote.
 */
export const syncRestaurantGeohash = async (
  restaurantId: string,
  data: DocumentData | undefined,
): Promise<boolean> => {
  const wanted = geohashFor(data);

  if (wanted === data?.['geohash']) {
    return false;
  }

  await getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .update({ geohash: wanted ?? FieldValue.delete() });

  return true;
};
