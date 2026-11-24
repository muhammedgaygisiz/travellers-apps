jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getDocument: jest.fn(),
    setDocument: jest.fn(),
    deleteDocument: jest.fn(),
  },
}));

import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  followRestaurant,
  isFollowingRestaurant,
  unfollowRestaurant,
} from '../restaurant-follow';

const FOLLOW = 'users/guest-1/followedRestaurants/r-1';

/** GitHub issue #2132. */
describe('restaurant follow', () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads the follow from under the guest's account", async () => {
    jest
      .mocked(FirebaseFirestore.getDocument)
      .mockResolvedValueOnce({
        snapshot: { data: { restaurantId: 'r-1' } },
      } as never)
      .mockResolvedValueOnce({ snapshot: { data: null } } as never);

    expect(await isFollowingRestaurant('guest-1', 'r-1')).toBe(true);
    expect(await isFollowingRestaurant('guest-1', 'r-1')).toBe(false);
    expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
      reference: FOLLOW,
    });
  });

  it('writes the restaurant id and when the follow began, nothing else', async () => {
    const now = new Date('2026-11-24T12:00:00.000Z');

    await followRestaurant('guest-1', 'r-1', now);

    expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
      reference: FOLLOW,
      data: {
        restaurantId: 'r-1',
        createdAt: '2026-11-24T12:00:00.000Z',
        createdAtTimestamp: now.getTime(),
      },
    });
  });

  it('deletes the follow to unfollow', async () => {
    await unfollowRestaurant('guest-1', 'r-1');

    expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
      reference: FOLLOW,
    });
  });
});
