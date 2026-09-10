import { getAuth } from 'firebase-admin/auth';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import {
  BiteTribeRole,
  hasRole,
  isBiteTribeRole,
  requireAnyRole,
  ROLES_CLAIM,
} from '../shared/roles';
import { TargetUserRequest, resolveTargetUid } from '../shared/target-user';
import { setRoles } from '../users/set-user-roles';

const RESTAURANT_COLLECTION = 'restaurants';
const USERS_COLLECTION = 'users';

/**
 * One document per staff account, named by the account's own uid.
 *
 * The name is the whole "one restaurant per staff account" rule: a second
 * restaurant has nowhere to be written. Out of scope until issue #1079 shows
 * whether more is needed (issue #1537), and this shape means allowing it later
 * is a schema change somebody has to make on purpose rather than a state the
 * data can drift into.
 *
 * It is a collection of its own rather than a `staffUserIds` array on the
 * restaurant, because `/restaurants` is readable by every signed-in account:
 * an array there would publish each restaurant's staff list to the consumer
 * app.
 */
const RESTAURANT_STAFF_COLLECTION = 'restaurantStaff';

const STAFF_ROLE: BiteTribeRole = 'staff';

/**
 * The roles a staff change may not touch, in either direction.
 *
 * Granting them is the privilege-escalation path this callable exists to avoid
 * - `staff` is a business-app key, and `admin` and `business` are more - and
 * the callable never writes either, so that half is structural. Refusing to act
 * on an account that *holds* one is the other half: a restaurant owner is not
 * allowed to strip an operator's `admin`, or another restaurant's `business`,
 * by naming them as staff to remove.
 */
const PROTECTED_ROLES: readonly BiteTribeRole[] = ['admin', 'business'];

/** The roles the caller must hold one of. See the note on `requireAnyRole`. */
const STAFF_MANAGEMENT_ROLES: readonly BiteTribeRole[] = ['business', 'admin'];

export interface AddRestaurantStaffRequest extends TargetUserRequest {
  restaurantId?: unknown;
}

export interface RemoveRestaurantStaffRequest extends TargetUserRequest {
  restaurantId?: unknown;
}

export interface ListRestaurantStaffRequest {
  restaurantId?: unknown;
}

export interface RestaurantStaffMember {
  uid: string;
  email: string;
  displayName: string;
  addedBy: string;
  addedAt: string;
}

export interface AddRestaurantStaffResult {
  restaurantId: string;
  uid: string;
  roles: BiteTribeRole[];
  /**
   * `already-staff` is the idempotent repeat: this account is already on this
   * restaurant, so no association was written. The same shape
   * `assignRestaurantOwner` uses for `already-assigned`.
   */
  status: 'added' | 'already-staff';
}

export interface RemoveRestaurantStaffResult {
  restaurantId: string;
  uid: string;
  roles: BiteTribeRole[];
}

export interface ListRestaurantStaffResult {
  restaurantId: string;
  staff: RestaurantStaffMember[];
}

const getString = (data: DocumentData, field: string): string =>
  typeof data[field] === 'string' ? data[field] : '';

const parseRequired = (value: unknown, field: string): string => {
  const parsed = typeof value === 'string' ? value.trim() : '';

  if (!parsed) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }

  return parsed;
};

/** The roles on an account's Auth record, absent- and malformed-safe. */
const rolesOfAccount = async (uid: string): Promise<BiteTribeRole[]> => {
  let claims: Record<string, unknown>;

  try {
    claims = (await getAuth().getUser(uid)).customClaims ?? {};
  } catch {
    throw new HttpsError('not-found', `No account found for ${uid}.`);
  }

  const raw = claims[ROLES_CLAIM];

  return Array.isArray(raw) ? raw.filter(isBiteTribeRole) : [];
};

const assertNotPrivileged = (uid: string, roles: BiteTribeRole[]): void => {
  const held = PROTECTED_ROLES.filter((role) => roles.includes(role));

  if (held.length) {
    throw new HttpsError(
      'failed-precondition',
      `Account ${uid} holds the ${held.join(' and ')} role and cannot be managed as staff.`,
    );
  }
};

/**
 * Admits the caller and decides which restaurants it may act on.
 *
 * Two roles reach this callable and they are admitted for opposite reasons.
 * A `business` caller is authorised by **the restaurant document, not the
 * token**: `Restaurant.ownerUserId`, written by `assignRestaurantOwner`
 * (issue #1077), is the same field issue #1078's rules read, and a claim copy
 * of it would be a second version of one fact that can disagree. It also means
 * a revoked assignment stops authorising immediately instead of at the end of
 * the token's hour.
 *
 * An `admin` caller is authorised by `RD-UR-6`: the operator maintains every
 * restaurant, claimed or not. That is what keeps a restaurant which removed
 * its last account with access - or handed `staff` to the wrong person - from
 * having no way back.
 *
 * Being admitted is not being authorised. `requireAnyRole` only says the caller
 * holds one of the two; which restaurant that reaches is decided here.
 */
const requireRestaurantAuthority = async (
  request: CallableRequest<unknown>,
  restaurantId: string,
): Promise<string> => {
  const callerUid = requireAnyRole(request, ...STAFF_MANAGEMENT_ROLES);

  const snapshot = await getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Restaurant was not found.');
  }

  if (hasRole(request, 'admin')) {
    return callerUid;
  }

  if (getString(snapshot.data() ?? {}, 'ownerUserId') !== callerUid) {
    throw new HttpsError(
      'permission-denied',
      'This restaurant is not assigned to your account.',
    );
  }

  return callerUid;
};

/**
 * Writes the target's role set with `staff` added or removed, and nothing else
 * changed.
 *
 * `setCustomUserClaims` replaces the whole claim object, so a grant that wrote
 * `['staff']` would silently revoke whatever else the account held. The roles
 * are re-read here rather than reused from the authorisation check, so the
 * window in which another writer could change them is the width of this
 * function instead of the width of the whole call — and the protected-role
 * check is repeated on what was actually read.
 */
const writeStaffRole = async (
  uid: string,
  present: boolean,
): Promise<BiteTribeRole[]> => {
  const roles = await rolesOfAccount(uid);

  assertNotPrivileged(uid, roles);

  const without = roles.filter((role) => role !== STAFF_ROLE);

  return setRoles(uid, present ? [...without, STAFF_ROLE] : without);
};

/**
 * The two writes are ordered so that the failure between them is the harmless
 * one.
 *
 * The role is a Firebase Auth custom claim and the association is a Firestore
 * document, so no transaction can hold both — the acceptance criterion "a
 * failure leaves neither" is delivered by ordering plus a compensating write
 * rather than by one commit. The Firestore half *is* transactional, which is
 * what stops two callers writing an association each.
 *
 * The invariant chosen is **the role never exists without the association**,
 * because that is the state with consequences: `staff` opens the business app,
 * and an account holding it with no restaurant is inside a privileged app with
 * nothing legitimately to do there. The reverse — an association with no role —
 * grants nothing at all, so it is the safe side to fail on. A grant therefore
 * writes the association first and a removal drops the role first, and each
 * undoes its first write if the second one throws.
 */
const compensate = async (undo: () => Promise<unknown>): Promise<void> => {
  try {
    await undo();
  } catch (error) {
    // Swallowed on purpose: the caller is about to see the real failure, and
    // rethrowing from here would replace it with the failure of the cleanup.
    console.error('Failed to undo a partial staff change:', error);
  }
};

/**
 * Puts an existing account on a restaurant as staff.
 *
 * The caller is a restaurant owner acting on a restaurant it holds, or an
 * operator acting on any restaurant. **`setUserRoles` is deliberately not
 * widened to do this**: it replaces the whole role set and is admin-only, so a
 * business caller reaching it could write `admin`. This one adds exactly
 * `staff` and refuses every account that already holds a privileged role.
 *
 * The association is the point of the grant. A staff account with the role and
 * no restaurant can open the business app and see nothing, so the two are
 * written together — see the note on `compensate` for what "together" can mean
 * across Auth and Firestore.
 *
 * Repeating the same grant is idempotent: the association is left as it is and
 * the role is written again, which also repairs an account whose claim was
 * lost. Putting an account on a *second* restaurant is refused rather than
 * moved, because one restaurant per staff account is the scope of issue #1537
 * and a silent move would be a second decision nobody made.
 */
export const addRestaurantStaffHandler = async (
  request: CallableRequest<AddRestaurantStaffRequest>,
): Promise<AddRestaurantStaffResult> => {
  const restaurantId = parseRequired(
    request.data?.restaurantId,
    'restaurantId',
  );
  const actingUid = await requireRestaurantAuthority(request, restaurantId);
  const targetUid = await resolveTargetUid(request.data ?? {});

  if (targetUid === actingUid) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot add your own account as staff.',
    );
  }

  assertNotPrivileged(targetUid, await rolesOfAccount(targetUid));

  logOperatorAction(request, {
    action: 'addRestaurantStaff',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'started',
    details: { restaurantId },
  });

  const db = getFirestore();
  const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc(restaurantId);
  const staffRef = db.collection(RESTAURANT_STAFF_COLLECTION).doc(targetUid);
  const isOperator = hasRole(request, 'admin');

  const status = await db.runTransaction<AddRestaurantStaffResult['status']>(
    async (transaction) => {
      const restaurant = await transaction.get(restaurantRef);

      if (!restaurant.exists) {
        throw new HttpsError('not-found', 'Restaurant was not found.');
      }

      // Re-read inside the transaction: the assignment could have been revoked
      // between the authorisation check and this commit, and a staff account
      // added by an account that no longer holds the restaurant is exactly the
      // write the ownership boundary exists to refuse.
      if (
        !isOperator &&
        getString(restaurant.data() ?? {}, 'ownerUserId') !== actingUid
      ) {
        throw new HttpsError(
          'permission-denied',
          'This restaurant is not assigned to your account.',
        );
      }

      const existing = await transaction.get(staffRef);
      const existingRestaurantId = existing.exists
        ? getString(existing.data() ?? {}, 'restaurantId')
        : '';

      if (existingRestaurantId === restaurantId) {
        return 'already-staff';
      }

      if (existingRestaurantId) {
        throw new HttpsError(
          'failed-precondition',
          `Account ${targetUid} is already staff on ${existingRestaurantId}. Remove it from that restaurant first.`,
        );
      }

      const now = new Date();

      transaction.set(staffRef, {
        userId: targetUid,
        restaurantId,
        addedBy: actingUid,
        addedAt: now.toISOString(),
        addedAtTimestamp: now.getTime(),
      });

      return 'added';
    },
  );

  let roles: BiteTribeRole[];

  try {
    roles = await writeStaffRole(targetUid, true);
  } catch (error) {
    if (status === 'added') {
      await compensate(() => staffRef.delete());
    }

    throw error;
  }

  logOperatorAction(request, {
    action: 'addRestaurantStaff',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'succeeded',
    details: { restaurantId, status, roles },
  });

  return { restaurantId, uid: targetUid, roles, status };
};

/**
 * Takes an account off a restaurant, and takes `staff` with it.
 *
 * Both halves, always. Leaving the role behind would leave an account inside
 * the business app with no restaurant, and leaving the association behind would
 * put the role straight back the next time anything repaired claims from it.
 *
 * The removed account keeps its session for as long as its ID token is valid —
 * up to an hour — and is then returned to the login page by `roleGuard` rather
 * than to a broken screen. That window is the same one blocking an account has
 * (`Architecture - Auth`), and it is stated rather than solved.
 */
export const removeRestaurantStaffHandler = async (
  request: CallableRequest<RemoveRestaurantStaffRequest>,
): Promise<RemoveRestaurantStaffResult> => {
  const restaurantId = parseRequired(
    request.data?.restaurantId,
    'restaurantId',
  );
  const actingUid = await requireRestaurantAuthority(request, restaurantId);
  const targetUid = await resolveTargetUid(request.data ?? {});

  const previousRoles = await rolesOfAccount(targetUid);

  assertNotPrivileged(targetUid, previousRoles);

  const db = getFirestore();
  const staffRef = db.collection(RESTAURANT_STAFF_COLLECTION).doc(targetUid);
  const existing = await staffRef.get();
  const existingData = existing.exists ? (existing.data() ?? {}) : {};

  if (getString(existingData, 'restaurantId') !== restaurantId) {
    throw new HttpsError(
      'not-found',
      `Account ${targetUid} is not staff on this restaurant.`,
    );
  }

  logOperatorAction(request, {
    action: 'removeRestaurantStaff',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'started',
    details: { restaurantId },
  });

  // The role goes first: see the note on `compensate`. If the association
  // delete then fails, the account is left associated and roleless, which
  // grants nothing.
  const roles = await writeStaffRole(targetUid, false);
  const isOperator = hasRole(request, 'admin');

  try {
    await db.runTransaction(async (transaction) => {
      const restaurant = await transaction.get(
        db.collection(RESTAURANT_COLLECTION).doc(restaurantId),
      );

      if (
        !isOperator &&
        getString(restaurant.data() ?? {}, 'ownerUserId') !== actingUid
      ) {
        throw new HttpsError(
          'permission-denied',
          'This restaurant is not assigned to your account.',
        );
      }

      const current = await transaction.get(staffRef);

      if (
        current.exists &&
        getString(current.data() ?? {}, 'restaurantId') === restaurantId
      ) {
        transaction.delete(staffRef);
      }
    });
  } catch (error) {
    await compensate(() => setRoles(targetUid, previousRoles));

    throw error;
  }

  logOperatorAction(request, {
    action: 'removeRestaurantStaff',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'succeeded',
    details: { restaurantId, roles },
  });

  return { restaurantId, uid: targetUid, roles };
};

/**
 * What the `/users` document adds to the Firebase Auth record.
 *
 * The same join `listUsersWithRoles` makes, for the same reason: BiteTribe
 * writes the chosen display name to `/users` and never back to the Auth record,
 * so a staff list built from Auth alone shows a blank name for every
 * email/password account (issue #1476).
 */
const readDisplayNames = async (
  uids: string[],
): Promise<Map<string, string>> => {
  if (!uids.length) {
    return new Map();
  }

  const firestore = getFirestore();
  const snapshots = await firestore.getAll(
    ...uids.map((uid) => firestore.collection(USERS_COLLECTION).doc(uid)),
  );

  return snapshots.reduce((names, snapshot) => {
    const stored = snapshot.exists
      ? getString(snapshot.data() ?? {}, 'displayName')
      : '';

    return stored ? names.set(snapshot.id, stored) : names;
  }, new Map<string, string>());
};

/**
 * The accounts on one restaurant.
 *
 * A callable rather than a client query, because the authorisation for it is
 * "you hold this restaurant" and a Firestore rule cannot answer that for a
 * *collection* query without one `get()` per result. The rules do allow the
 * same read one document at a time, so this is the ergonomic path rather than
 * the only one - the boundary is enforced in both places.
 *
 * The email comes from Firebase Auth because that is the identifier the owner
 * added the account by and the one they will recognise. It reads nothing about
 * the account that the owner did not already have.
 */
export const listRestaurantStaffHandler = async (
  request: CallableRequest<ListRestaurantStaffRequest>,
): Promise<ListRestaurantStaffResult> => {
  const restaurantId = parseRequired(
    request.data?.restaurantId,
    'restaurantId',
  );

  await requireRestaurantAuthority(request, restaurantId);

  const query = await getFirestore()
    .collection(RESTAURANT_STAFF_COLLECTION)
    .where('restaurantId', '==', restaurantId)
    .get();

  const associations = query.docs.map((snapshot) => ({
    uid: snapshot.id,
    addedBy: getString(snapshot.data() ?? {}, 'addedBy'),
    addedAt: getString(snapshot.data() ?? {}, 'addedAt'),
  }));

  if (!associations.length) {
    return { restaurantId, staff: [] };
  }

  const uids = associations.map(({ uid }) => uid);
  const [records, displayNames] = await Promise.all([
    getAuth().getUsers(uids.map((uid) => ({ uid }))),
    readDisplayNames(uids),
  ]);

  const emails = new Map(
    records.users.map((user) => [user.uid, user.email ?? '']),
  );

  return {
    restaurantId,
    staff: associations
      .map((association) => ({
        ...association,
        email: emails.get(association.uid) ?? '',
        displayName: displayNames.get(association.uid) ?? '',
      }))
      .sort((a, b) => (a.email || a.uid).localeCompare(b.email || b.uid)),
  };
};

/**
 * The three live in one module because they are one boundary.
 *
 * Each of them answers "may this caller act on this restaurant" through
 * `requireRestaurantAuthority`, and that answer is the whole feature: split
 * across three files, three copies of it would be free to drift on what counts
 * as authority — which field, whether an operator is admitted, whether the
 * check is repeated inside the transaction. The same reason
 * `restaurant-ownership.ts` keeps assign and revoke together.
 */
export const addRestaurantStaff = onAppCheck<AddRestaurantStaffRequest>(
  addRestaurantStaffHandler,
);

export const removeRestaurantStaff = onAppCheck<RemoveRestaurantStaffRequest>(
  removeRestaurantStaffHandler,
);

export const listRestaurantStaff = onAppCheck<ListRestaurantStaffRequest>(
  listRestaurantStaffHandler,
);
