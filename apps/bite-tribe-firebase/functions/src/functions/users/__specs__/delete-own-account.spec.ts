import type { Firestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/https';
import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore, DELETE_SENTINEL } from './fake-firestore';

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
  rebuildLeaderboard: (...args: unknown[]): unknown =>
    rebuildLeaderboardMock(...args),
}));

import {
  assertRecentSignIn,
  deleteAccountForUser,
  deleteFollowEdgesForUser,
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

    expect(db.read('meta/leaderboardDaily')?.['users']).toEqual([
      { userId: 'other', displayName: 'Other', email: 'other@example.com' },
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
    db.seed('reviews/review-1', { authorId: UID, review: 'Great' });
    db.seed('reviews/review-2', { authorId: 'someone-else', review: 'Fine' });
    db.seed(`bucketlists/list-1`, { userId: UID, name: 'Tokyo' });
    db.seed('biteTrails/trail-1', { ownerId: 'someone-else' });
    db.seed(`biteTrails/trail-1/ratings/${UID}`, { rating: 4 });
    db.seed('biteTrails/trail-1/sells/sell-1', { userId: UID, soldAt: 'x' });
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
    expect(db.exists('bucketlists/list-1')).toBe(false);
    expect(db.exists(`biteTrails/trail-1/ratings/${UID}`)).toBe(false);
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
      deletedLikes: 1,
      deletedReviews: 1,
      deletedBucketlists: 1,
      deletedRatings: 1,
      anonymizedSales: 1,
      deletedFollowEdges: 0,
      deletedPushTokens: 1,
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
