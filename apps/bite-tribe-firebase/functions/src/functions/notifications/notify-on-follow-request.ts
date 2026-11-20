import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { Translate } from '../shared/i18n/translate';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import { USERS_COLLECTION } from '../shared/utils/user-blocks';
import {
  FOLLOW_REQUESTS_COLLECTION,
  followRequestId,
} from '../users/follow-request';

/**
 * The name a follow-request push gives the other party: their display name,
 * or `Someone` when they have none.
 *
 * A private account is named too, by its display name only (decided on
 * 19 November 2026 under `Follow Request Questions` in `Current State - Open
 * Questions`). The owner's list shows a private requester the same way, and the
 * name is what that account chose to put in front of the other one. A real
 * name is never read (issue #1308).
 */
const readParty = async (
  db: Firestore,
  uid: string,
): Promise<{ exists: boolean; displayName?: string }> => {
  const snap = await db.collection(USERS_COLLECTION).doc(uid).get();
  const displayName = snap.data()?.['displayName'];

  return {
    exists: snap.exists,
    ...(typeof displayName === 'string' && displayName.trim()
      ? { displayName: displayName.trim() }
      : {}),
  };
};

const orSomeone = (name: string | undefined, translate: Translate): string =>
  name ?? translate('common.someone');

/**
 * Tells a private profile's owner that `requesterUid` asked to follow them
 * (GitHub issue #2166). The push opens the follow-requests page.
 *
 * A request whose document id does not name its own pair is ignored, as is one
 * whose requester has no user document: there is nobody to accept.
 */
export const notifyOwnerOfFollowRequest = async (
  db: Firestore,
  requestId: string,
  request: { ownerUid?: unknown; requesterUid?: unknown },
): Promise<void> => {
  const { ownerUid, requesterUid } = request;

  if (
    typeof ownerUid !== 'string' ||
    typeof requesterUid !== 'string' ||
    !ownerUid ||
    !requesterUid ||
    requestId !== followRequestId(ownerUid, requesterUid)
  ) {
    logger.warn('notifyOwnerOnFollowRequest: malformed request, no push', {
      requestId,
    });

    return;
  }

  const requester = await readParty(db, requesterUid);

  if (!requester.exists) {
    logger.warn('notifyOwnerOnFollowRequest: requester is gone, no push', {
      requestId,
    });

    return;
  }

  await sendLocalizedNotification({
    uids: [ownerUid],
    data: { type: 'FOLLOW_REQUEST', requesterUid },
    buildMessage: (translate) => ({
      title: translate('followRequest.title'),
      body: translate('followRequest.body', {
        requester: orSomeone(requester.displayName, translate),
      }),
    }),
  });
};

/**
 * Tells `requesterUid` that `ownerUid` accepted their follow request (GitHub
 * issue #2166). The push opens the owner's profile, which the requester can
 * now see.
 *
 * Sent by `acceptFollowRequest` after its transaction committed, rather than
 * by a trigger on the follower edge: an edge cannot tell an accepted request
 * from a public follow. That edge still fires `notifyUserOnNewFollower`, which
 * stays silent because the owner is private, so the owner gets no
 * `New Follower!` push for a follower they just accepted.
 */
export const notifyRequesterOfAcceptedFollowRequest = async (
  db: Firestore,
  ownerUid: string,
  requesterUid: string,
): Promise<void> => {
  const owner = await readParty(db, ownerUid);

  await sendLocalizedNotification({
    uids: [requesterUid],
    data: { type: 'FOLLOW_REQUEST_ACCEPTED', ownerUid },
    buildMessage: (translate) => ({
      title: translate('followRequestAccepted.title'),
      body: translate('followRequestAccepted.body', {
        owner: orSomeone(owner.displayName, translate),
      }),
    }),
  });
};

/** A new follow request pushes to its owner (GitHub issue #2166). */
export const notifyOwnerOnFollowRequest = onDocumentCreated(
  `${FOLLOW_REQUESTS_COLLECTION}/{requestId}`,
  async (event) => {
    const snap = event.data;

    if (!snap) {
      return;
    }

    await notifyOwnerOfFollowRequest(
      getFirestore(),
      event.params.requestId,
      snap.data(),
    );
  },
);
