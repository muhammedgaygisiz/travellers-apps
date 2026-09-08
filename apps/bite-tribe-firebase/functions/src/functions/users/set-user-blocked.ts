import { getAuth } from 'firebase-admin/auth';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';

interface SetUserBlockedRequest {
  uid?: unknown;
  blocked?: unknown;
}

export interface SetUserBlockedResult {
  uid: string;
  blocked: boolean;
  previouslyBlocked: boolean;
}

const parseUid = (value: unknown): string => {
  const uid = typeof value === 'string' ? value.trim() : '';

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }

  return uid;
};

/**
 * The flag is required and has to be a boolean.
 *
 * Not defaulted to `true`: this callable both blocks and unblocks, and a
 * malformed payload that silently means "block" is the wrong way round for the
 * destructive half of the pair.
 */
const parseBlocked = (value: unknown): boolean => {
  if (typeof value !== 'boolean') {
    throw new HttpsError('invalid-argument', 'blocked must be a boolean.');
  }

  return value;
};

/**
 * Reads the account's current state, and turns "no such account" into the code
 * that says so.
 *
 * `updateUser` on an unknown uid throws `auth/user-not-found`, which reaches a
 * client as `internal`. An operator who mistyped a uid should be told that,
 * not that the backend broke.
 */
const readDisabled = async (uid: string): Promise<boolean> => {
  try {
    return (await getAuth().getUser(uid)).disabled;
  } catch {
    throw new HttpsError('not-found', `No account found for ${uid}.`);
  }
};

/**
 * Blocks and unblocks a BiteTribe account.
 *
 * Blocking is Firebase Auth's `disabled` flag and nothing else. Firebase
 * enforces it when a session is created or a token is refreshed, so nothing has
 * to be written into Firestore rules and nothing has to be checked in app code
 * — which is what makes this the whole feature rather than the first half of
 * one (epic #1471).
 *
 * **A live session survives a block, for as long as the ID token it already
 * holds.** Disabling the account closes the two doors Firebase owns: a fresh
 * sign-in is refused with `auth/user-disabled`, and a refresh cannot mint a new
 * ID token. It does not recall the token already in the client, which stays
 * verifiable until it expires — at most an hour. `revokeRefreshTokens` is
 * called alongside so the revocation time is recorded and any caller that
 * verifies with `checkRevoked` rejects that token immediately; no callable does
 * today, which is exactly why the hour is stated rather than assumed away.
 *
 * It is called only when blocking. Revoking on the way back would sign the
 * account out of a session it does not have, and the point of unblocking is to
 * let it sign in again.
 *
 * **Blocking removes nothing.** The account's Bites, reviews and restaurants
 * are untouched, and removing them is a separate operator action with its own
 * log entry (#1475). One action with hidden consequences is harder to reason
 * about and harder to undo.
 *
 * An operator may not block themselves. Only an admin can unblock, so the last
 * one to block their own account locks every operator out of the tool that
 * would let them back in, and the only way back is the bootstrap script running
 * with service-account credentials — the same lockout `setUserRoles` refuses
 * for admin self-demotion. Blocking a *different* operator is allowed: it is
 * recoverable by any other admin, and refusing it would mean an abusive
 * operator account could not be stopped by the tool built to stop accounts.
 */
export const setUserBlockedHandler = async (
  request: CallableRequest<SetUserBlockedRequest>,
): Promise<SetUserBlockedResult> => {
  const callerUid = requireAdmin(request);
  const targetUid = parseUid(request.data?.uid);
  const blocked = parseBlocked(request.data?.blocked);

  if (blocked && targetUid === callerUid) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot block your own account.',
    );
  }

  const previouslyBlocked = await readDisabled(targetUid);

  await getAuth().updateUser(targetUid, { disabled: blocked });

  if (blocked) {
    await getAuth().revokeRefreshTokens(targetUid);
  }

  logOperatorAction(request, {
    action: 'setUserBlocked',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'succeeded',
    details: { blocked, previouslyBlocked },
  });

  return { uid: targetUid, blocked, previouslyBlocked };
};

export const setUserBlocked = onAppCheck<SetUserBlockedRequest>(
  setUserBlockedHandler,
);
