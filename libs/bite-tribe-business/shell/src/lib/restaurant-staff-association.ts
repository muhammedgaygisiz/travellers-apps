import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { isRestaurantOwner, RestaurantOwnership } from 'model';

/** Where the account-to-restaurant association lives (issue #1537). */
export const RESTAURANT_STAFF_COLLECTION = 'restaurantStaff';
export const RESTAURANT_COLLECTION = 'restaurants';
export const STAFF_RESTAURANT_FIELD = 'restaurantId';

/**
 * One document, or one field off it, or `undefined` if anything at all went
 * wrong.
 *
 * A read that fails and a field that is absent are the same answer on purpose:
 * offline, a deleted document and a rule that has since narrowed all mean "not
 * established", and none of them mean "and therefore yes". Every caller here
 * is deciding access, so they fail closed on `undefined`.
 */
const dataOf = async (
  reference: string,
): Promise<Record<string, unknown> | undefined> => {
  try {
    const { snapshot } = await FirebaseFirestore.getDocument({ reference });

    return snapshot?.data ?? undefined;
  } catch {
    return undefined;
  }
};

const fieldOf = async (reference: string, field: string): Promise<unknown> =>
  (await dataOf(reference))?.[field];

/**
 * The one restaurant this account works at, or `undefined` if it works at none
 * (GitHub issue #1097).
 *
 * Read by the caller's own uid, which is the only read of that collection
 * `firestore.rules` allows an ordinary account, so this is one `get` rather
 * than a query — and it is the client-side half of `worksAt()` in the rules.
 *
 * It answers **which** restaurant rather than whether a given one matches,
 * because the two guards that need it ask different questions:
 * `restaurantAccessGuard` compares it with the id in the URL, and
 * `staffEntryGuard` has no id yet and is asking where to send the account.
 */
export const staffRestaurantIdOf = async (
  uid: string,
): Promise<string | undefined> => {
  const restaurantId = await fieldOf(
    `${RESTAURANT_STAFF_COLLECTION}/${uid}`,
    STAFF_RESTAURANT_FIELD,
  );

  return typeof restaurantId === 'string' && restaurantId
    ? restaurantId
    : undefined;
};

/**
 * Whether this account is one of the owners named on the restaurant document,
 * through either ownership field (epic #1614).
 */
export const holdsRestaurant = async (
  uid: string,
  restaurantId: string,
): Promise<boolean> =>
  isRestaurantOwner(
    (await dataOf(`${RESTAURANT_COLLECTION}/${restaurantId}`)) as
      RestaurantOwnership | undefined,
    uid,
  );
