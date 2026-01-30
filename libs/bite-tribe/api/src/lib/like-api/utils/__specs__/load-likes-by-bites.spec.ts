import { loadLikesByBites } from '../load-likes-by-bites';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite } from 'model';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCollection: jest.fn(),
  },
}));

describe(loadLikesByBites.name, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('given no bites', () => {
    it('should return an empty array', async () => {
      const result = await loadLikesByBites([]);
      expect(result).toEqual([]);
    });
  });

  describe('given bites without id', () => {
    it('should return an empty array', async () => {
      const bites = [{} as any];
      const result = await loadLikesByBites(bites);
      expect(result).toEqual([]);
    });
  });

  describe('given bites with id', () => {
    it('should return likes for the bites', async () => {
      const bites = [{ id: 'bite1' }, { id: 'bite2' }] as Bite[];

      const mockLikesBite1 = [
        { id: 'like1', userId: 'user1' },
        { id: 'like2', userId: 'user2' },
      ];
      const mockLikesBite2 = [{ id: 'like3', userId: 'user3' }];

      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockImplementationOnce(async () => ({
          snapshots: mockLikesBite1.map((like) => ({
            data: like,
          })) as any,
        }))
        .mockImplementationOnce(async () => ({
          snapshots: mockLikesBite2.map((like) => ({
            data: like,
          })) as any,
        }));

      const result = await loadLikesByBites(bites);

      expect(result).toEqual([...mockLikesBite1, ...mockLikesBite2]);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledTimes(2);
      expect(FirebaseFirestore.getCollection).toHaveBeenNthCalledWith(1, {
        reference: 'bites/bite1/likes',
      });
      expect(FirebaseFirestore.getCollection).toHaveBeenNthCalledWith(2, {
        reference: 'bites/bite2/likes',
      });
    });
  });
});
