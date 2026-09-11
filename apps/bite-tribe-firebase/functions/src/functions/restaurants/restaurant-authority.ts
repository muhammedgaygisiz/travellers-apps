import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { BiteTribeRole, hasRole, requireAnyRole } from '../shared/roles';

export const RESTAURANT_COLLECTION = 'restaurants';

/**
 * The roles a caller acting for one restaurant must hold one of.
 *
 * Two roles and two reasons. A `business` caller is the account a restaurant
 * was assigned to; an `admin` caller is the operator, admitted by `RD-UR-6` so
 * that a restaurant which locks itself out has a way back. Neither implies the
 * other - see the note on `requireBusiness` in `shared/roles.ts`.
 */
const RESTAURANT_AUTHORITY_ROLES: readonly BiteTribeRole[] = [
  'business',
  'admin',
];

const ownerUserIdOf = (data: DocumentData): string =>
  typeof data['ownerUserId'] === 'string' ? data['ownerUserId'] : '';

/**
 * Admits the caller and decides which restaurant it may act on.
 *
 * Extracted from `restaurant-staff.ts` (issue #1537) when the QR token
 * callables of issue #1086 became the second surface asking the same question.
 * A second copy would have been free to drift on every part of the answer -
 * which field carries ownership, whether an operator is admitted, what a
 * missing restaurant produces - and those are exactly the parts a reviewer
 * cannot check by reading one file.
 *
 * A `business` caller is authorised by **the restaurant document, not the
 * token**: `Restaurant.ownerUserId`, written by `assignRestaurantOwner`
 * (issue #1077), is the same field `firestore.rules` reads. A claim copy of it
 * would be a second version of one fact that can disagree, and it also means a
 * revoked assignment stops authorising immediately rather than at the end of
 * the token's hour.
 *
 * Being admitted is not being authorised. `requireAnyRole` only says the caller
 * holds one of the two roles; which restaurant that reaches is decided here.
 *
 * The returned uid is the acting account, which every caller needs again: to
 * record who acted, and to re-check ownership inside a transaction where the
 * assignment could have been revoked since this call.
 */
export const requireRestaurantAuthority = async (
  request: CallableRequest<unknown>,
  restaurantId: string,
): Promise<string> => {
  const actingUid = requireAnyRole(request, ...RESTAURANT_AUTHORITY_ROLES);

  const snapshot = await getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Restaurant was not found.');
  }

  if (hasRole(request, 'admin')) {
    return actingUid;
  }

  if (ownerUserIdOf(snapshot.data() ?? {}) !== actingUid) {
    throw new HttpsError(
      'permission-denied',
      'This restaurant is not assigned to your account.',
    );
  }

  return actingUid;
};

/**
 * The same decision, taken again inside a transaction.
 *
 * The authorisation above is a read that happened before the commit, and an
 * assignment can be revoked in between. A callable that writes therefore
 * re-checks against the restaurant it read transactionally, and this is that
 * check: an operator passes, an owner passes only while the document still
 * names it.
 */
export const holdsRestaurant = (
  request: CallableRequest<unknown>,
  restaurant: DocumentData,
  actingUid: string,
): boolean =>
  hasRole(request, 'admin') || ownerUserIdOf(restaurant) === actingUid;

/** A required string argument, trimmed, or an `invalid-argument` failure. */
export const parseRequiredString = (value: unknown, field: string): string => {
  const parsed = typeof value === 'string' ? value.trim() : '';

  if (!parsed) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }

  return parsed;
};
