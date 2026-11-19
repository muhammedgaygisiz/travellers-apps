import {
  DocumentData,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { loadBlockedUids, USERS_COLLECTION } from '../shared/utils/user-blocks';
import { FOLLOW_REQUESTS_COLLECTION } from './follow-request';
import { toHttpsUrl, toText } from './suggestable-person';

/**
 * One pending request to follow the caller's private profile, as the owner's
 * list shows it (GitHub issue #2165).
 *
 * Repeated in `libs/bite-tribe-common/model/src/lib/follow-request.ts`; the two
 * have to be changed together.
 */
export interface PendingFollowRequest {
  requesterUid: string;
  /** Absent when the requester has not set one; the list then says Anonymous. */
  displayName?: string;
  /** Only for a public requester. A private one shows the default avatar. */
  photoUrl?: string;
  /** ISO 8601, when the request was made. */
  createdAt: string;
}

export interface ListFollowRequestsResult {
  requests: PendingFollowRequest[];
}

/**
 * What the owner sees of one requester.
 *
 * A public requester shows their display name and photo, as any list of people
 * does. A private requester shows their display name only (decided on
 * 19 November 2026, `Current State - Open Questions`): the owner could not
 * judge a request from `Anonymous`, and the name is what the requester already
 * chose to put in front of the account they asked to follow. Their photo and
 * everything else on their profile stays private.
 */
const toPendingRequest = (
  requesterUid: string,
  createdAt: string,
  profile: DocumentData,
): PendingFollowRequest => {
  const displayName = toText(profile['displayName']);
  const photoUrl =
    profile['public'] === true ? toHttpsUrl(profile['photoUrl']) : undefined;

  return {
    requesterUid,
    createdAt,
    ...(displayName ? { displayName } : {}),
    ...(photoUrl ? { photoUrl } : {}),
  };
};

/**
 * The pending requests addressed to `ownerUid`, newest first.
 *
 * Sorted here rather than by the query, so the read needs no composite index
 * on `ownerUid` and `createdAt`. A request from an account the owner blocks is
 * left out: `blockUser` deletes it, and this covers one that raced the block.
 * A request whose requester has no user document is left out too, because
 * there is nobody to show or to follow.
 */
export const listFollowRequestsFor = async (
  db: Firestore,
  ownerUid: string,
): Promise<ListFollowRequestsResult> => {
  const [snapshot, blockedUids] = await Promise.all([
    db
      .collection(FOLLOW_REQUESTS_COLLECTION)
      .where('ownerUid', '==', ownerUid)
      .get(),
    loadBlockedUids(db, ownerUid),
  ]);

  const pending = snapshot.docs
    .map((doc) => doc.data())
    .filter(
      (data): data is DocumentData & { requesterUid: string } =>
        typeof data['requesterUid'] === 'string' &&
        data['requesterUid'] !== ownerUid &&
        !blockedUids.has(data['requesterUid']),
    )
    .map((data) => ({
      requesterUid: data.requesterUid,
      createdAt: typeof data['createdAt'] === 'string' ? data['createdAt'] : '',
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (pending.length === 0) {
    return { requests: [] };
  }

  const users = db.collection(USERS_COLLECTION);
  const profiles = await db.getAll(
    ...pending.map(({ requesterUid }) => users.doc(requesterUid)),
  );
  const profileByUid = new Map(
    profiles
      .filter((profile) => profile.exists)
      .map((profile) => [profile.id, profile.data() ?? {}]),
  );

  return {
    requests: pending.flatMap(({ requesterUid, createdAt }) => {
      const profile = profileByUid.get(requesterUid);

      return profile
        ? [toPendingRequest(requesterUid, createdAt, profile)]
        : [];
    }),
  };
};

export const listFollowRequestsHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListFollowRequestsResult> => {
  requireMember(request, 'You must be signed in to see your follow requests.');

  return listFollowRequestsFor(getFirestore(), request.auth.uid);
};

/**
 * The caller's pending follow requests (GitHub issue #2165). A callable rather
 * than a client read, because the owner may not read a private requester's
 * user document, and the list needs the requester's display name.
 */
export const listFollowRequests = onAppCheck<unknown>(
  listFollowRequestsHandler,
);
