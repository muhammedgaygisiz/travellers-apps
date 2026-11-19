import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { RESTAURANT_COLLECTION } from '../restaurants/restaurant-authority';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import {
  BITE_TRIBE_ROLES,
  BiteTribeRole,
  ROLES_CLAIM,
  TABLE_GUEST_ROLE,
  isBiteTribeRole,
  requireAdmin,
} from '../shared/roles';
import { TargetUserRequest, resolveTargetUid } from '../shared/target-user';

/**
 * Replaces an account's roles, preserving every other custom claim it carries.
 *
 * `setCustomUserClaims` overwrites the whole claim object rather than merging
 * into it, so the existing claims are read first. Writing only `{ roles }`
 * would silently drop anything else a future feature stores there.
 *
 * The write takes effect in a client on its next token refresh, which Firebase
 * performs at most hourly on its own — the client forces one when a role check
 * misses, so a grant is visible without signing out and back in.
 */
export const setRoles = async (
  uid: string,
  roles: BiteTribeRole[],
): Promise<BiteTribeRole[]> => {
  const auth = getAuth();
  const user = await auth.getUser(uid);
  const uniqueRoles = [...new Set(roles)];

  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    [ROLES_CLAIM]: uniqueRoles,
  });

  return uniqueRoles;
};

interface SetUserRolesRequest extends TargetUserRequest {
  roles?: unknown;
}

export interface SetUserRolesResult {
  uid: string;
  roles: BiteTribeRole[];
}

const parseRoles = (value: unknown): BiteTribeRole[] => {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'roles must be an array.');
  }

  const unknownRoles = value.filter((role) => !isBiteTribeRole(role));

  if (unknownRoles.length) {
    throw new HttpsError(
      'invalid-argument',
      `Unknown role(s): ${unknownRoles.join(', ')}. Known roles: ${BITE_TRIBE_ROLES.join(', ')}.`,
    );
  }

  // `tableGuest` is a role, and the one no operator hands out (issue #1629):
  // it is written by `startTableSession` on the anonymous account a scan mints,
  // and an account given it here would read as a guest at no table - admitted
  // to nothing, and confusing wherever a session is listed.
  if (value.includes(TABLE_GUEST_ROLE)) {
    throw new HttpsError(
      'invalid-argument',
      `${TABLE_GUEST_ROLE} is granted by a table scan, not by an operator.`,
    );
  }

  return value as BiteTribeRole[];
};

/**
 * The role pairs that cannot be held by one account.
 *
 * `business` operates a restaurant; `staff` is the narrowed set of what can be
 * done on one. An account holding both is asking to be treated as an owner and
 * as an employee at once, and every reader — the route guards, the rules of
 * issue #1078, the scoped dashboard of #1079 — would need the same precedence
 * rule to resolve it. Refusing the pair here means there is no precedence rule
 * to keep in step across three places.
 *
 * `admin` is not in conflict with either. An operator account may also run a
 * restaurant, and epic #1471 keeps operator actions on their own callables
 * rather than inferring them from the absence of another role.
 */
const EXCLUSIVE_ROLE_PAIRS: readonly (readonly [
  BiteTribeRole,
  BiteTribeRole,
])[] = [['business', 'staff']];

/**
 * Rejects a submitted set that holds both halves of an exclusive pair.
 *
 * Checked against the whole submitted set rather than against the delta,
 * because the callable replaces rather than merges: what arrives is the account's
 * intended role set in full, so the conflict is visible without reading what it
 * held before.
 */
const assertRolesCompatible = (roles: BiteTribeRole[]): void => {
  const conflict = EXCLUSIVE_ROLE_PAIRS.find(
    ([first, second]) => roles.includes(first) && roles.includes(second),
  );

  if (conflict) {
    throw new HttpsError(
      'failed-precondition',
      `An account cannot hold both the ${conflict[0]} and ${conflict[1]} roles.`,
    );
  }
};

/**
 * What an account holds through a role, listed so that dropping the role
 * cannot leave those holdings behind (issue #1539).
 *
 * `assignRestaurantOwner` refuses an account without `business`, because the
 * business app turns such an account away at the door. Without this list the
 * same invariant would hold only at the moment of assignment: revoking the
 * role afterwards left the restaurant naming an owner who could not open it.
 *
 * Each entry returns a readable label per holding, so the refusal can name
 * what to revoke first. A role whose holdings matter adds one entry here.
 */
interface RoleHoldings {
  readonly role: BiteTribeRole;
  readonly holdingsOf: (uid: string) => Promise<string[]>;
}

const ownedRestaurantsOf = async (uid: string): Promise<string[]> => {
  const snapshot = await getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .where('ownerUserIds', 'array-contains', uid)
    .get();

  return snapshot.docs.map((doc) => {
    const name: unknown = doc.get('name');

    return typeof name === 'string' && name ? `${name} (${doc.id})` : doc.id;
  });
};

/**
 * The `details.reason` of the refusal, so the admin app can show the holdings
 * without parsing the message.
 */
export const ROLE_HOLDINGS_REFUSAL = 'role-holdings';

const ROLE_HOLDINGS: readonly RoleHoldings[] = [
  { role: 'business', holdingsOf: ownedRestaurantsOf },
];

const currentRolesOf = (
  claims: Record<string, unknown> | undefined,
): BiteTribeRole[] => {
  const roles = claims?.[ROLES_CLAIM];

  return Array.isArray(roles) ? roles.filter(isBiteTribeRole) : [];
};

/**
 * Refuses a write that drops a role while the account still holds something
 * through it.
 *
 * Only a role the account holds now and the submitted set leaves out is
 * checked, so a grant, or a write that keeps every current role, reads
 * nothing from Firestore. Refusing rather than cascading is deliberate: taking
 * a restaurant away is an operator decision with its own reason and log entry,
 * not a side effect of a role write.
 */
const assertDroppedRolesHoldNothing = async (
  uid: string,
  currentRoles: BiteTribeRole[],
  roles: BiteTribeRole[],
): Promise<void> => {
  for (const { role, holdingsOf } of ROLE_HOLDINGS) {
    if (!currentRoles.includes(role) || roles.includes(role)) {
      continue;
    }

    const holdings = await holdingsOf(uid);

    if (holdings.length) {
      throw new HttpsError(
        'failed-precondition',
        `The account still owns ${holdings.join(', ')}. Revoke its ownership on Restaurant ownership before removing the ${role} role.`,
        { reason: ROLE_HOLDINGS_REFUSAL, role, holdings },
      );
    }
  }
};

/**
 * Grants and revokes BiteTribe roles on another account.
 *
 * This is the callable behind the admin app's role management, and it is the
 * only way a `business` role is ever created: a restaurant does not sign itself
 * up for business access, it is granted access after we verify its claim on a
 * phone call (issue #1469).
 *
 * The whole role set is replaced rather than added to, so revoking is the same
 * operation as granting with the role left out, and two operators editing the
 * same account cannot end up merging their intents into a union neither chose.
 *
 * An admin may not remove their own `admin` role. Roles can only be written by
 * an admin, so the last admin to drop it locks every operator out of the tool
 * that grants it, and the only way back is the bootstrap script running with
 * service-account credentials. Refusing the self-demotion is cheaper than the
 * recovery.
 *
 * `business` and `staff` cannot be granted together. The two are mutually
 * exclusive on one account, and the refusal happens before the target is even
 * resolved so a conflicting payload cannot cost an Auth lookup (issue #1075).
 *
 * `business` cannot be removed while the account still owns a restaurant. The
 * refusal names the restaurants, so the operator knows what to revoke first
 * (issue #1539).
 */
export const setUserRolesHandler = async (
  request: CallableRequest<SetUserRolesRequest>,
): Promise<SetUserRolesResult> => {
  const callerUid = requireAdmin(request);
  const roles = parseRoles(request.data.roles);

  assertRolesCompatible(roles);

  const targetUid = await resolveTargetUid(request.data);

  if (targetUid === callerUid && !roles.includes('admin')) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot remove your own admin role.',
    );
  }

  const target = await getAuth().getUser(targetUid);

  await assertDroppedRolesHoldNothing(
    targetUid,
    currentRolesOf(target.customClaims),
    roles,
  );

  const writtenRoles = await setRoles(targetUid, roles);

  logOperatorAction(request, {
    action: 'setUserRoles',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'succeeded',
    details: { roles: writtenRoles },
  });

  return { uid: targetUid, roles: writtenRoles };
};

export const setUserRoles =
  onAppCheck<SetUserRolesRequest>(setUserRolesHandler);
