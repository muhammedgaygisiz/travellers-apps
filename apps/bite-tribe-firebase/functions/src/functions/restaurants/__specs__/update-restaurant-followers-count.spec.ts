const updateMock = jest.fn();
const restaurantRef = { path: 'restaurants/r-1' };
const docMock = jest.fn(() => restaurantRef);
const runTransactionMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    doc: docMock,
    runTransaction: runTransactionMock,
  })),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_path, handler) => handler),
  onDocumentDeleted: jest.fn((_path, handler) => handler),
}));

jest.mock('../restaurant-authority', () => ({
  RESTAURANT_COLLECTION: 'restaurants',
}));

import {
  decrementRestaurantFollowersOnUnfollow,
  incrementRestaurantFollowersOnFollow,
} from '../update-restaurant-followers-count';

const stubRestaurant = (
  restaurant: Record<string, unknown> | undefined,
): void => {
  runTransactionMock.mockImplementation(async (callback) => {
    await callback({
      get: jest.fn(
        async (): Promise<{ exists: boolean; data: () => unknown }> => ({
          exists: restaurant !== undefined,
          data: () => restaurant,
        }),
      ),
      update: updateMock,
    });
  });
};

const event = { params: { userId: 'guest-1', restaurantId: 'r-1' } } as never;

/** GitHub issue #2132. */
describe('the restaurant follower count', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts a follow, and starts from 0 on a restaurant without a count', async () => {
    stubRestaurant({ followersCount: 4 });
    await incrementRestaurantFollowersOnFollow(event);
    expect(docMock).toHaveBeenCalledWith('restaurants/r-1');
    expect(updateMock).toHaveBeenLastCalledWith(restaurantRef, {
      followersCount: 5,
    });

    stubRestaurant({ name: 'Trattoria' });
    await incrementRestaurantFollowersOnFollow(event);
    expect(updateMock).toHaveBeenLastCalledWith(restaurantRef, {
      followersCount: 1,
    });
  });

  it('counts an unfollow, and never below 0', async () => {
    stubRestaurant({ followersCount: 4 });
    await decrementRestaurantFollowersOnUnfollow(event);
    expect(updateMock).toHaveBeenLastCalledWith(restaurantRef, {
      followersCount: 3,
    });

    stubRestaurant({});
    await decrementRestaurantFollowersOnUnfollow(event);
    expect(updateMock).toHaveBeenLastCalledWith(restaurantRef, {
      followersCount: 0,
    });
  });

  it('leaves a deleted restaurant alone', async () => {
    stubRestaurant(undefined);
    await incrementRestaurantFollowersOnFollow(event);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
