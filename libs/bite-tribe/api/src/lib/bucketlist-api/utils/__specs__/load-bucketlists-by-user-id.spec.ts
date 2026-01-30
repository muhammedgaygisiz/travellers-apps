import { loadBucketlistsByUserId } from '../load-bucketlists-by-user-id';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCollection: jest.fn(),
  },
}));

describe(loadBucketlistsByUserId.name, () => {
  describe('given no bucketlists for user', () => {
    beforeEach(() => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      });
    });

    it('should return an empty array', async () => {
      const userId = 'user-123';
      const result = await loadBucketlistsByUserId(userId);
      expect(result).toEqual([]);
    });
  });

  describe('given bucketlists for user', () => {
    const mockBucketlists = [
      {
        id: 'bucketlist-1',
        data: {
          userId: 'user-123',
          title: 'Visit Paris',
          createdAtTimestamp: 1620000000,
        },
      },
      {
        id: 'bucketlist-2',
        data: {
          userId: 'user-123',
          title: 'Climb Everest',
          createdAtTimestamp: 1610000000,
        },
      },
    ];

    beforeEach(() => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: mockBucketlists as any,
      });
    });

    it('should return the bucketlists array', async () => {
      const userId = 'user-123';
      const result = await loadBucketlistsByUserId(userId);
      expect(result).toEqual([
        {
          id: 'bucketlist-1',
          userId: 'user-123',
          title: 'Visit Paris',
          createdAtTimestamp: 1620000000,
        },
        {
          id: 'bucketlist-2',
          userId: 'user-123',
          title: 'Climb Everest',
          createdAtTimestamp: 1610000000,
        },
      ]);
    });
  });
});
