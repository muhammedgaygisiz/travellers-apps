const updateMock = jest.fn();
const collectionMock = jest.fn();
const userRef = { collection: collectionMock };
const docMock = jest.fn(() => userRef);
const runTransactionMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    doc: docMock,
    runTransaction: runTransactionMock,
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_options, handler) => handler),
  onDocumentDeleted: jest.fn((_options, handler) => handler),
}));

import {
  decrementFollowersCountOnFollowerDelete,
  decrementFollowingCountOnFollowingDelete,
  incrementFollowersCountOnFollowerCreate,
  incrementFollowingCountOnFollowingCreate,
} from '../update-follow-counts-on-follow-write';

/**
 * Wires the transaction mock so `transaction.get(userRef)` returns the given
 * user snapshot and `transaction.get(subcollection)` returns a snapshot of the
 * given size, matching the read order in the production helper.
 */
const stubTransaction = (
  user: { exists: boolean; data?: () => Record<string, unknown> },
  subcollectionSize = 0,
): void => {
  const subcollectionRef = { __sub: true };
  collectionMock.mockReturnValue(subcollectionRef);

  runTransactionMock.mockImplementation(async (callback) => {
    const get = jest.fn(async (ref: unknown) =>
      ref === subcollectionRef ? { size: subcollectionSize } : user,
    );

    await callback({ get, update: updateMock });
  });
};

describe('update follow counts on follow write', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments followersCount on follower create when the aggregate exists', async () => {
    stubTransaction({ exists: true, data: () => ({ followersCount: 5 }) });

    await incrementFollowersCountOnFollowerCreate({
      params: { userId: 'user-1', followerId: 'follower-1' },
    } as never);

    expect(docMock).toHaveBeenCalledWith('users/user-1');
    expect(updateMock).toHaveBeenCalledWith(userRef, {
      followersCount: 6,
      updatedAt: 'server-timestamp',
    });
  });

  it('increments followingCount on following create when the aggregate exists', async () => {
    stubTransaction({ exists: true, data: () => ({ followingCount: 2 }) });

    await incrementFollowingCountOnFollowingCreate({
      params: { userId: 'user-1', followedId: 'followed-1' },
    } as never);

    expect(updateMock).toHaveBeenCalledWith(userRef, {
      followingCount: 3,
      updatedAt: 'server-timestamp',
    });
  });

  it('migrates from the subcollection instead of blindly incrementing when the aggregate is missing', async () => {
    // Existing user with five followers but no followersCount yet; the new
    // follower is already in the subcollection when the trigger fires.
    stubTransaction({ exists: true, data: () => ({}) }, 6);

    await incrementFollowersCountOnFollowerCreate({
      params: { userId: 'legacy-user', followerId: 'follower-1' },
    } as never);

    expect(collectionMock).toHaveBeenCalledWith('followers');
    expect(updateMock).toHaveBeenCalledWith(userRef, {
      followersCount: 6,
      updatedAt: 'server-timestamp',
    });
  });

  it('decrements followersCount and clamps at zero', async () => {
    stubTransaction({ exists: true, data: () => ({ followersCount: 0 }) });

    await decrementFollowersCountOnFollowerDelete({
      params: { userId: 'user-1', followerId: 'follower-1' },
    } as never);

    expect(updateMock).toHaveBeenCalledWith(userRef, {
      followersCount: 0,
      updatedAt: 'server-timestamp',
    });
  });

  it('decrements followingCount by one when above zero', async () => {
    stubTransaction({ exists: true, data: () => ({ followingCount: 3 }) });

    await decrementFollowingCountOnFollowingDelete({
      params: { userId: 'user-1', followedId: 'followed-1' },
    } as never);

    expect(updateMock).toHaveBeenCalledWith(userRef, {
      followingCount: 2,
      updatedAt: 'server-timestamp',
    });
  });

  it('skips the update when the user document is missing', async () => {
    stubTransaction({ exists: false });

    await decrementFollowersCountOnFollowerDelete({
      params: { userId: 'ghost', followerId: 'follower-1' },
    } as never);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
