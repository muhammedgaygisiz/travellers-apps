import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { BiteTribeRole, hasRole, requireAnyRole } from '../shared/roles';

export const RESTAURANT_COLLECTION = 'restaurants';

/**
 * Who works at a restaurant: one document per staff account, named by that
 * account's own uid, holding the single restaurant it works at.
 *
 * The name is the whole "one restaurant per staff account" rule - a second
 * restaurant has nowhere to be written - and more than one is out of scope
 * until issue #1079 shows whether it is needed. It is a collection of its own
 * rather than a `staffUserIds` array on the restaurant, because `/restaurants`
 * is readable by every signed-in account: an array there would publish each
 * restaurant's staff list to the consumer app.
 *
 * It lives here rather than in `restaurant-staff.ts`, which writes it, because
 * with issue #1092 it became half of the answer to "may this caller act on this
 * restaurant" - which is what this module is. Three modules now name it: the
 * one that writes it, `users/delete-own-account.ts`, which clears it, and the
 * table-state authority below. A collection one of them owns and the other two
 * spell by hand is a collection the three can silently disagree about.
 */
export const RESTAURANT_STAFF_COLLECTION = 'restaurantStaff';

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

/**
 * The roles a caller acting on a restaurant's *live table state* must hold one
 * of (GitHub issue #1092).
 *
 * Three rather than two. A host changing a table during service is `staff`,
 * which is the role's first write of any kind - until now `staff` opened the
 * business app and could read a published plan and nothing else. The owner is
 * admitted because a small restaurant is its own host, and the operator by
 * `RD-UR-6`, for the same support reason as everywhere else.
 *
 * Being admitted is not being authorised: which restaurant each of them
 * reaches is decided by {@link holdsTableStateAuthority}.
 */
const TABLE_STATE_AUTHORITY_ROLES: readonly BiteTribeRole[] = [
  'staff',
  'business',
  'admin',
];

const staffRestaurantIdOf = (data: DocumentData | undefined): string =>
  typeof data?.['restaurantId'] === 'string' ? data['restaurantId'] : '';

/**
 * Whether the caller works at this one restaurant.
 *
 * Both halves are required, and this is deliberately the same pair the
 * `worksAt()` function in `firestore.rules` checks. The claim without the
 * association is "some restaurant employs this account", which says nothing
 * about *this* one; the association without the claim is a document that
 * outlived the grant it was written with, and `removeRestaurantStaff` is not
 * the only way a role can end.
 */
export const worksAtRestaurant = (
  request: CallableRequest<unknown>,
  staffAssociation: DocumentData | undefined,
  restaurantId: string,
): boolean =>
  hasRole(request, 'staff') &&
  staffRestaurantIdOf(staffAssociation) === restaurantId;

/**
 * Whether this caller may change the live table state of this restaurant.
 *
 * The operator and the owner reach it through {@link holdsRestaurant}, which is
 * the same answer every other restaurant surface uses; a staff account reaches
 * it only through its own association. **Never through the `staff` role
 * alone** - a blanket any-staff-acts-on-any-restaurant clause would make the
 * role a key to every dining room in BiteTribe, which is the shape of hole
 * issue #1537 closed for the restaurant document.
 *
 * Separate from the authorisation below so the transaction can take the same
 * decision again on the documents it read: an assignment can be revoked, and a
 * staff account can be taken off a restaurant, between the check and the
 * commit.
 */
export const holdsTableStateAuthority = (
  request: CallableRequest<unknown>,
  restaurant: DocumentData,
  staffAssociation: DocumentData | undefined,
  restaurantId: string,
  actingUid: string,
): boolean =>
  holdsRestaurant(request, restaurant, actingUid) ||
  worksAtRestaurant(request, staffAssociation, restaurantId);

/**
 * Admits a caller to one restaurant's live table state, and returns its uid.
 *
 * Kept apart from {@link requireRestaurantAuthority} rather than folded into it
 * with a wider role list. The two answer different questions: that one is
 * "may you configure this restaurant", which staff must never pass, and this
 * one is "may you operate it during service", which is the only thing staff may
 * do. One function taking a role list would make the difference an argument at
 * each call site instead of a decision in one place, and the call site that got
 * it wrong would be the one that handed a host the QR rotation.
 */
export const requireTableStateAuthority = async (
  request: CallableRequest<unknown>,
  restaurantId: string,
): Promise<string> => {
  const actingUid = requireAnyRole(request, ...TABLE_STATE_AUTHORITY_ROLES);

  const firestore = getFirestore();
  const [restaurant, staffAssociation] = await Promise.all([
    firestore.collection(RESTAURANT_COLLECTION).doc(restaurantId).get(),
    firestore.collection(RESTAURANT_STAFF_COLLECTION).doc(actingUid).get(),
  ]);

  if (!restaurant.exists) {
    throw new HttpsError('not-found', 'Restaurant was not found.');
  }

  if (
    !holdsTableStateAuthority(
      request,
      restaurant.data() ?? {},
      staffAssociation.data(),
      restaurantId,
      actingUid,
    )
  ) {
    throw new HttpsError(
      'permission-denied',
      'You do not work at this restaurant.',
    );
  }

  return actingUid;
};

/** A required string argument, trimmed, or an `invalid-argument` failure. */
export const parseRequiredString = (value: unknown, field: string): string => {
  const parsed = typeof value === 'string' ? value.trim() : '';

  if (!parsed) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }

  return parsed;
};
