import type { Firestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/https';
import type { FakeFirestore } from './fake-firestore';
import {
  arrayRemove,
  createFakeFirestore,
  DELETE_SENTINEL,
} from './fake-firestore';

let db: FakeFirestore;

const deleteUserMock = jest.fn();
const deleteFilesMock = jest.fn();
const rebuildLeaderboardMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): { deleteUser: jest.Mock } => ({ deleteUser: deleteUserMock }),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: (): { bucket: () => { deleteFiles: jest.Mock } } => ({
    bucket: (): { deleteFiles: jest.Mock } => ({
      deleteFiles: deleteFilesMock,
    }),
  }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: {
    delete: (): typeof DELETE_SENTINEL => DELETE_SENTINEL,
    serverTimestamp: (): string => 'server-timestamp',
    arrayRemove: (...values: unknown[]): unknown => arrayRemove(...values),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
  onCall: jest.fn((_options, handler) => handler),
}));

jest.mock('../../shared/utils/leaderboard', () => ({
  META_COLLECTION: 'meta',
  LEADERBOARD_DAILY_DOC: 'leaderboardDaily',
  toLeaderboardEntry: jest.requireActual('../../shared/utils/leaderboard')
    .toLeaderboardEntry,
  rebuildLeaderboard: (...args: unknown[]): unknown =>
    rebuildLeaderboardMock(...args),
}));

import {
  assertRecentSignIn,
  deleteAccountForUser,
  deleteBlockEdgesForUser,
  deleteFollowEdgesForUser,
  deleteFollowRequestsForUser,
  deleteOwnAccountHandler,
  refreshLeaderboardsAfterDeletion,
  REAUTH_MAX_AGE_SECONDS,
} from '../delete-own-account';

const UID = 'user-1';
const NOW = new Date('2026-07-29T10:00:00.000Z');

/**
 * The fake stands in for the admin Firestore. It implements only the surface the
 * cascade uses, so the cast is deliberate rather than a gap in the typing.
 */
const asFirestore = (fake: FakeFirestore): Firestore =>
  fake as unknown as Firestore;

const asRequest = (request: {
  data: unknown;
  auth?: { uid: string; token: { auth_time: number } };
}): CallableRequest<unknown> => request as unknown as CallableRequest<unknown>;

const authTimeSecondsAgo = (seconds: number): number =>
  Math.floor(NOW.getTime() / 1000) - seconds;

describe('assertRecentSignIn', () => {
  it('accepts a sign-in inside the allowed window', () => {
    expect(() =>
      assertRecentSignIn(authTimeSecondsAgo(REAUTH_MAX_AGE_SECONDS - 1), NOW),
    ).not.toThrow();
  });

  it('rejects a sign-in older than the allowed window', () => {
    expect(() =>
      assertRecentSignIn(authTimeSecondsAgo(REAUTH_MAX_AGE_SECONDS + 1), NOW),
    ).toThrow('reauth_required');
  });

  it('rejects a token without an auth time', () => {
    expect(() => assertRecentSignIn(undefined, NOW)).toThrow('reauth_required');
  });
});

describe('deleteOwnAccountHandler', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('rejects an unauthenticated caller', async () => {
    await expect(
      deleteOwnAccountHandler(asRequest({ data: {} })),
    ).rejects.toThrow('You must be signed in to delete your account.');
  });

  it('rejects a caller whose sign-in is stale', async () => {
    await expect(
      deleteOwnAccountHandler(
        asRequest({
          data: {},
          auth: { uid: UID, token: { auth_time: 0 } },
        }),
      ),
    ).rejects.toThrow('reauth_required');
  });
});

describe('deleteFollowEdgesForUser', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('removes the user from both sides of every follow relationship', async () => {
    db.seed(`users/${UID}/followers/follower-1`, { userId: 'follower-1' });
    db.seed(`users/follower-1/following/${UID}`, { userId: UID });
    db.seed(`users/${UID}/following/followed-1`, { userId: 'followed-1' });
    db.seed(`users/followed-1/followers/${UID}`, { userId: UID });

    const deleted = await deleteFollowEdgesForUser(asFirestore(db), UID);

    expect(deleted).toBe(4);
    expect(db.exists(`users/${UID}/followers/follower-1`)).toBe(false);
    expect(db.exists(`users/follower-1/following/${UID}`)).toBe(false);
    expect(db.exists(`users/${UID}/following/followed-1`)).toBe(false);
    expect(db.exists(`users/followed-1/followers/${UID}`)).toBe(false);
  });
});

describe('deleteBlockEdgesForUser', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('removes both sides of every block the user placed or received', async () => {
    db.seed(`users/${UID}/blocked/blocked-1`, {});
    db.seed(`users/blocked-1/blockedBy/${UID}`, {});
    db.seed(`users/${UID}/blockedBy/blocker-1`, {});
    db.seed(`users/blocker-1/blocked/${UID}`, {});
    db.seed('users/blocker-1/blocked/someone-else', {});

    const deleted = await deleteBlockEdgesForUser(asFirestore(db), UID);

    expect(deleted).toBe(4);
    expect(db.exists(`users/${UID}/blocked/blocked-1`)).toBe(false);
    expect(db.exists(`users/blocked-1/blockedBy/${UID}`)).toBe(false);
    expect(db.exists(`users/${UID}/blockedBy/blocker-1`)).toBe(false);
    expect(db.exists(`users/blocker-1/blocked/${UID}`)).toBe(false);
    expect(db.exists('users/blocker-1/blocked/someone-else')).toBe(true);
  });
});

describe('deleteFollowRequestsForUser', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('deletes every follow request the user sent or received', async () => {
    db.seed(`followRequests/${UID}_requester-1`, {
      ownerUid: UID,
      requesterUid: 'requester-1',
    });
    db.seed(`followRequests/owner-1_${UID}`, {
      ownerUid: 'owner-1',
      requesterUid: UID,
    });
    db.seed('followRequests/owner-1_requester-1', {
      ownerUid: 'owner-1',
      requesterUid: 'requester-1',
    });

    const deleted = await deleteFollowRequestsForUser(asFirestore(db), UID);

    expect(deleted).toBe(2);
    expect(db.exists(`followRequests/${UID}_requester-1`)).toBe(false);
    expect(db.exists(`followRequests/owner-1_${UID}`)).toBe(false);
    expect(db.exists('followRequests/owner-1_requester-1')).toBe(true);
  });
});

describe('refreshLeaderboardsAfterDeletion', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    rebuildLeaderboardMock.mockReset();
  });

  it('prunes the deleted user from the daily baseline and rebuilds the leaderboard', async () => {
    db.seed('meta/leaderboardDaily', {
      users: [
        { userId: 'other', displayName: 'Other', email: 'other@example.com' },
        { userId: UID, displayName: 'Gone', email: 'gone@example.com' },
      ],
    });

    await refreshLeaderboardsAfterDeletion(asFirestore(db), UID);

    // The pruned baseline is written back without the email a legacy
    // snapshot cached (issue #1611).
    expect(db.read('meta/leaderboardDaily')?.['users']).toEqual([
      { userId: 'other', displayName: 'Other' },
    ]);
    expect(rebuildLeaderboardMock).toHaveBeenCalledWith(db);
  });

  it('still rebuilds when no baseline exists yet', async () => {
    await refreshLeaderboardsAfterDeletion(asFirestore(db), UID);

    expect(rebuildLeaderboardMock).toHaveBeenCalledWith(db);
  });
});

describe('deleteAccountForUser', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    deleteUserMock.mockReset().mockResolvedValue(undefined);
    deleteFilesMock.mockReset().mockResolvedValue(undefined);
    rebuildLeaderboardMock.mockReset().mockResolvedValue([]);
  });

  const seedFullAccount = (): void => {
    db.seed(`users/${UID}`, {
      displayName: 'Gone User',
      normalizedDisplayName: 'gone user',
      email: 'gone@example.com',
    });
    db.seed('displayNames/gone user', { userId: UID });
    db.seed(`settings/${UID}`, { theme: 'dark' });
    db.seed(`users/${UID}/pushTokens/token-1`, { enabled: true });
    db.seed('bites/bite-1', { userId: UID, name: 'Ramen' });
    db.seed('bites/bite-2', { userId: 'someone-else', name: 'Pizza' });
    db.seed(`bites/bite-2/likes/${UID}`, { userId: UID, likeType: 'thumbup' });
    db.seed(`bites/bite-1/authorPrivate/${UID}`, {
      userId: UID,
      photoPosition: { latitude: 36.74, longitude: -5.16 },
    });
    db.seed('reviews/review-1', { authorId: UID, review: 'Great' });
    db.seed('reviews/review-2', { authorId: 'someone-else', review: 'Fine' });
    db.seed(`bucketlists/list-1`, { userId: UID, name: 'Tokyo' });
    db.seed('biteTrails/trail-1', { ownerId: 'someone-else' });
    db.seed(`biteTrails/trail-1/ratings/${UID}`, { rating: 4 });
    db.seed('biteTrails/trail-1/sells/sell-1', { userId: UID, soldAt: 'x' });
    db.seed(`restaurantStaff/${UID}`, {
      userId: UID,
      restaurantId: 'restaurant-1',
      addedBy: 'owner-1',
    });
  };

  it('keeps the bites and clears their author', async () => {
    seedFullAccount();

    await deleteAccountForUser(UID, NOW);

    expect(db.exists('bites/bite-1')).toBe(true);
    expect(db.read('bites/bite-1')).toEqual({ name: 'Ramen' });
    expect(db.read('bites/bite-2')).toEqual({
      userId: 'someone-else',
      name: 'Pizza',
    });
  });

  /**
   * The Bite survives with its author cleared, so the position read from its
   * photo has to go here rather than with the Bite (GitHub issue #1290).
   */
  it('removes the photo positions kept privately on its own Bites', async () => {
    seedFullAccount();
    db.seed('bites/bite-2/authorPrivate/someone-else', {
      userId: 'someone-else',
      photoPosition: { latitude: 47.0, longitude: 7.4 },
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.exists('bites/bite-1')).toBe(true);
    expect(db.exists(`bites/bite-1/authorPrivate/${UID}`)).toBe(false);
    expect(db.exists('bites/bite-2/authorPrivate/someone-else')).toBe(true);
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      deletedBitePhotoPositions: 1,
    });
  });

  it('takes the account off every Bite it is tagged in', async () => {
    seedFullAccount();
    db.seed('bites/bite-3', {
      userId: 'someone-else',
      name: 'Dumplings',
      taggedUserIds: [UID, 'friend-1'],
    });
    db.seed('bites/bite-4', {
      userId: 'friend-1',
      name: 'Tacos',
      taggedUserIds: [UID],
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.read('bites/bite-3')?.['taggedUserIds']).toEqual(['friend-1']);
    expect(db.read('bites/bite-4')?.['taggedUserIds']).toEqual([]);
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      removedBiteTags: 2,
    });
  });

  it('keeps BiteTrail purchase records and clears the buyer', async () => {
    seedFullAccount();

    await deleteAccountForUser(UID, NOW);

    expect(db.read('biteTrails/trail-1/sells/sell-1')).toEqual({
      soldAt: 'x',
    });
  });

  it('removes the profile, claim, settings, tokens, likes, reviews, bucket lists and ratings', async () => {
    seedFullAccount();

    await deleteAccountForUser(UID, NOW);

    expect(db.exists(`users/${UID}`)).toBe(false);
    expect(db.exists('displayNames/gone user')).toBe(false);
    expect(db.exists(`settings/${UID}`)).toBe(false);
    expect(db.exists(`users/${UID}/pushTokens/token-1`)).toBe(false);
    expect(db.exists(`bites/bite-2/likes/${UID}`)).toBe(false);
    expect(db.exists('reviews/review-1')).toBe(false);
    expect(db.exists('reviews/review-2')).toBe(true);
  });

  // Issue #2116: somebody else's reply is not the deleted account's to take.
  it('keeps an answered review as a tombstone without the name or the uid', async () => {
    db.seed('reviews/answered', {
      authorId: UID,
      author: 'Ana',
      review: 'Great',
      biteId: '/bites/bite-1',
    });
    db.seed('reviews/their-reply', {
      authorId: 'someone-else',
      review: 'Agreed',
      biteId: '/bites/bite-1',
      parentReviewId: 'answered',
      threadId: 'answered',
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.read('reviews/answered')).toEqual({
      biteId: '/bites/bite-1',
      deletedAt: expect.any(String),
      deletedAtTimestamp: expect.any(Number),
    });
    expect(db.exists('reviews/their-reply')).toBe(true);
    expect(db.exists('bucketlists/list-1')).toBe(false);
    expect(db.exists(`biteTrails/trail-1/ratings/${UID}`)).toBe(false);
  });

  it('removes every follow-up claim and every unsubscribe token of the account', async () => {
    seedFullAccount();
    db.seed(`newUserFollowUps/${UID}`, { status: 'sent' });
    db.seed(`newUserWeekFollowUps/${UID}`, { status: 'sent' });
    db.seed(`newUserMonthFollowUps/${UID}`, { status: 'sent' });
    db.seed('emailOptOuts/token-mine', { uid: UID });
    db.seed('emailOptOuts/token-theirs', { uid: 'someone-else' });

    await deleteAccountForUser(UID, NOW);

    expect(db.exists(`newUserFollowUps/${UID}`)).toBe(false);
    expect(db.exists(`newUserWeekFollowUps/${UID}`)).toBe(false);
    expect(db.exists(`newUserMonthFollowUps/${UID}`)).toBe(false);
    expect(db.exists('emailOptOuts/token-mine')).toBe(false);
    expect(db.exists('emailOptOuts/token-theirs')).toBe(true);
  });

  /**
   * The other half of a staff grant is the `staff` custom claim, which goes
   * with the Auth account. Leaving the association behind would put a row in
   * its restaurant's staff list naming a uid nobody can look up and its owner
   * cannot remove (issue #1537).
   */
  it('takes the account off the restaurant it works at', async () => {
    seedFullAccount();

    await deleteAccountForUser(UID, NOW);

    expect(db.exists(`restaurantStaff/${UID}`)).toBe(false);
  });

  it("leaves another account's association alone", async () => {
    seedFullAccount();
    db.seed('restaurantStaff/someone-else', {
      userId: 'someone-else',
      restaurantId: 'restaurant-1',
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.exists('restaurantStaff/someone-else')).toBe(true);
  });

  /**
   * A report's document is named by the reporter's uid, so clearing a field
   * would leave the identifier in the path. The reports go, and reports on the
   * account's own Bites - filed by somebody else - stay (issue #1608).
   */
  it('removes the reports the account filed and leaves reports on its Bites', async () => {
    seedFullAccount();
    db.seed(`biteReports/bite-2_${UID}`, {
      biteId: 'bite-2',
      reporterUid: UID,
      status: 'open',
    });
    db.seed('biteReports/bite-1_someone-else', {
      biteId: 'bite-1',
      reporterUid: 'someone-else',
      status: 'open',
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.exists(`biteReports/bite-2_${UID}`)).toBe(false);
    expect(db.exists('biteReports/bite-1_someone-else')).toBe(true);
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      deletedBiteReports: 1,
    });
  });

  /**
   * A profile report names both accounts in its path, so the reports the
   * account filed and the reports filed against it both go (issue #1829).
   */
  it('removes the profile reports the account filed and the ones against it', async () => {
    seedFullAccount();
    db.seed(`userReports/someone-else_${UID}`, {
      reportedUid: 'someone-else',
      reporterUid: UID,
      status: 'open',
    });
    db.seed(`userReports/${UID}_someone-else`, {
      reportedUid: UID,
      reporterUid: 'someone-else',
      status: 'dismissed',
    });
    db.seed('userReports/third_someone-else', {
      reportedUid: 'third',
      reporterUid: 'someone-else',
      status: 'open',
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.exists(`userReports/someone-else_${UID}`)).toBe(false);
    expect(db.exists(`userReports/${UID}_someone-else`)).toBe(false);
    expect(db.exists('userReports/third_someone-else')).toBe(true);
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      deletedUserReports: 2,
    });
  });

  /**
   * A review report names its reporter in its path and the reported author in
   * `reviewAuthorId`, so both directions go (issue #2117). A reply the account
   * wrote can outlive it as a tombstone, and its reports must not keep the uid.
   */
  it('removes the review reports the account filed and the ones against it', async () => {
    seedFullAccount();
    db.seed(`reviewReports/review-9_${UID}`, {
      reviewId: 'review-9',
      reviewAuthorId: 'someone-else',
      reporterUid: UID,
      status: 'open',
    });
    db.seed('reviewReports/review-8_someone-else', {
      reviewId: 'review-8',
      reviewAuthorId: UID,
      reporterUid: 'someone-else',
      status: 'dismissed',
    });
    db.seed('reviewReports/review-7_someone-else', {
      reviewId: 'review-7',
      reviewAuthorId: 'third',
      reporterUid: 'someone-else',
      status: 'open',
    });

    await deleteAccountForUser(UID, NOW);

    expect(db.exists(`reviewReports/review-9_${UID}`)).toBe(false);
    expect(db.exists('reviewReports/review-8_someone-else')).toBe(false);
    expect(db.exists('reviewReports/review-7_someone-else')).toBe(true);
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      deletedReviewReports: 2,
    });
  });

  /** Most accounts work at no restaurant, and the count has to say so. */
  it('records no removal for an account that is not staff', async () => {
    db.seed(`users/${UID}`, { displayName: 'Gone User' });

    await deleteAccountForUser(UID, NOW);

    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      deletedRestaurantStaff: 0,
    });
  });

  /**
   * Issue #1568: no restaurant goes on naming a uid that no longer exists, and
   * the restaurant ends where an operator's revoke would leave it.
   */
  describe('restaurants the account owns', () => {
    it('releases a restaurant it owns alone', async () => {
      db.seed(`users/${UID}`, { displayName: 'Gone User' });
      db.seed('restaurants/solo', {
        name: 'Solo',
        ownerUserIds: [UID],
        claimStatus: 'claimed',
        claimedAt: '2026-11-01T00:00:00.000Z',
        claimedAtTimestamp: 1,
      });

      await deleteAccountForUser(UID, NOW);

      const restaurant = db.read('restaurants/solo');

      expect(restaurant).toMatchObject({
        name: 'Solo',
        claimStatus: 'revoked',
      });
      expect(restaurant).not.toHaveProperty('ownerUserIds');
      expect(restaurant).not.toHaveProperty('claimedAt');
      expect(restaurant).not.toHaveProperty('claimedAtTimestamp');
      expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
        releasedRestaurants: 1,
      });
    });

    it('leaves the other owners of a shared restaurant in place', async () => {
      db.seed(`users/${UID}`, { displayName: 'Gone User' });
      db.seed('restaurants/shared', {
        ownerUserIds: ['partner', UID],
        claimStatus: 'claimed',
        claimedAt: '2026-11-01T00:00:00.000Z',
      });

      await deleteAccountForUser(UID, NOW);

      expect(db.read('restaurants/shared')).toMatchObject({
        ownerUserIds: ['partner'],
        claimStatus: 'claimed',
        claimedAt: '2026-11-01T00:00:00.000Z',
      });
    });

    it('leaves restaurants it does not own alone', async () => {
      db.seed(`users/${UID}`, { displayName: 'Gone User' });
      db.seed('restaurants/other', {
        ownerUserIds: ['partner'],
        claimStatus: 'claimed',
      });

      await deleteAccountForUser(UID, NOW);

      expect(db.read('restaurants/other')).toEqual({
        ownerUserIds: ['partner'],
        claimStatus: 'claimed',
      });
      expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
        releasedRestaurants: 0,
      });
    });

    it('releases them before the Auth account is deleted', async () => {
      db.seed(`users/${UID}`, { displayName: 'Gone User' });
      db.seed('restaurants/solo', {
        ownerUserIds: [UID],
        claimStatus: 'claimed',
      });
      let ownersAtAuthDelete: unknown;
      deleteUserMock.mockImplementationOnce(async () => {
        ownersAtAuthDelete = db.read('restaurants/solo')?.['ownerUserIds'];
      });

      await deleteAccountForUser(UID, NOW);

      expect(deleteUserMock).toHaveBeenCalledWith(UID);
      expect(ownersAtAuthDelete).toBeUndefined();
    });
  });

  it('deletes the profile images and the auth account', async () => {
    seedFullAccount();

    await deleteAccountForUser(UID, NOW);

    expect(deleteFilesMock).toHaveBeenCalledWith({
      prefix: `images/users/${UID}/`,
    });
    expect(deleteUserMock).toHaveBeenCalledWith(UID);
  });

  it('leaves a display-name claim already taken by someone else alone', async () => {
    seedFullAccount();
    db.seed('displayNames/gone user', { userId: 'another-user' });

    await deleteAccountForUser(UID, NOW);

    expect(db.read('displayNames/gone user')).toEqual({
      userId: 'another-user',
    });
  });

  it('records the job as completed', async () => {
    seedFullAccount();

    const result = await deleteAccountForUser(UID, NOW);

    expect(result).toEqual({ status: 'completed' });
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      userId: UID,
      status: 'completed',
      anonymizedBites: 1,
      removedBiteTags: 0,
      deletedLikes: 1,
      deletedReviews: 1,
      deletedBucketlists: 1,
      deletedRatings: 1,
      anonymizedSales: 1,
      deletedFollowEdges: 0,
      deletedBlockEdges: 0,
      deletedFollowRequests: 0,
      deletedPushTokens: 1,
      deletedRestaurantStaff: 1,
    });
  });

  it('is a no-op when the account was already deleted', async () => {
    db.seed(`accountDeletions/${UID}`, { status: 'completed' });

    const result = await deleteAccountForUser(UID, NOW);

    expect(result).toEqual({ status: 'completed' });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('records a failure and leaves the auth account in place', async () => {
    seedFullAccount();
    deleteFilesMock.mockRejectedValue(new Error('storage is down'));

    await expect(deleteAccountForUser(UID, NOW)).rejects.toThrow(
      'account_deletion_failed',
    );

    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(db.read(`accountDeletions/${UID}`)).toMatchObject({
      status: 'failed',
      error: 'storage is down',
    });
  });
});
