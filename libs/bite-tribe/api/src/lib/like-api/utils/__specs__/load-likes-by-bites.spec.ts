import { loadLikesByBites } from '../load-likes-by-bites';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite } from 'model';

jest.mock('@capacitor-firebase/firestore');

const userId = 'user1';

describe(loadLikesByBites.name, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('given no bites', () => {
    it('should return an empty array', async () => {
      const result = await loadLikesByBites([], userId);
      expect(result).toEqual([]);
    });
  });

  describe('given bites without id', () => {
    it('should return an empty array', async () => {
      const bites = [{} as any];
      const result = await loadLikesByBites(bites, userId);
      expect(result).toEqual([]);
    });
  });

  describe('given bites with id', () => {
    it("should return the current user's like per bite", async () => {
      const bites = [{ id: 'bite1' }, { id: 'bite2' }] as Bite[];

      const likeForBite1 = { userId, biteId: 'bite1', likeType: 'thumbup' };

      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockImplementationOnce(async () => ({
          snapshot: { data: likeForBite1 } as any,
        }))
        .mockImplementationOnce(async () => ({
          snapshot: { data: null } as any,
        }));

      const result = await loadLikesByBites(bites, userId);

      expect(result).toEqual([likeForBite1]);

      expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(2);
      expect(FirebaseFirestore.getDocument).toHaveBeenNthCalledWith(1, {
        reference: `bites/bite1/likes/${userId}`,
      });
      expect(FirebaseFirestore.getDocument).toHaveBeenNthCalledWith(2, {
        reference: `bites/bite2/likes/${userId}`,
      });
    });
  });
});
