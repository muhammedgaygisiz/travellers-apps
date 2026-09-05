import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  BITE_TRIBE_ROLES,
  BiteTribeRole,
  isBiteTribeRole,
  requireAdmin,
  rolesOf,
  setRoles,
} from '../shared/roles';

interface SetUserRolesRequest {
  uid?: unknown;
  email?: unknown;
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

  return value as BiteTribeRole[];
};

const getString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Resolves the account the roles are being written to.
 *
 * An operator working from a phone call has the restaurant's email address, not
 * its Firebase uid, so the callable accepts either. `uid` wins when both are
 * given, because it is the unambiguous one.
 */
const resolveTargetUid = async (data: SetUserRolesRequest): Promise<string> => {
  const uid = getString(data.uid);

  if (uid) {
    return uid;
  }

  const email = getString(data.email);

  if (!email) {
    throw new HttpsError(
      'invalid-argument',
      'Either uid or email is required.',
    );
  }

  try {
    return (await getAuth().getUserByEmail(email)).uid;
  } catch {
    throw new HttpsError('not-found', `No account found for ${email}.`);
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
 */
export const setUserRolesHandler = async (
  request: CallableRequest<SetUserRolesRequest>,
): Promise<SetUserRolesResult> => {
  const callerUid = requireAdmin(request);
  const roles = parseRoles(request.data.roles);
  const targetUid = await resolveTargetUid(request.data);

  if (targetUid === callerUid && !roles.includes('admin')) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot remove your own admin role.',
    );
  }

  const writtenRoles = await setRoles(targetUid, roles);

  logger.info('user roles updated', {
    targetUid,
    callerUid,
    roles: writtenRoles,
    callerRoles: rolesOf(request),
  });

  return { uid: targetUid, roles: writtenRoles };
};

export const setUserRoles =
  onAppCheck<SetUserRolesRequest>(setUserRolesHandler);
