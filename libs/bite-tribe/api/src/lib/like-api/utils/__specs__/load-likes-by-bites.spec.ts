import { loadLikesByBites } from '../load-likes-by-bites';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite } from 'model';

jest.mock('@capacitor-firebase/firestore');

const userId = 'user1';

const snapshotsOf = (...data: unknown[]): any => ({
  snapshots: data.map((entry, index) => ({ id: `doc${index}`, data: entry })),
});

describe(loadLikesByBites.name, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('given no bites', () => {
    it('should return an empty array', async () => {
      const result = await loadLikesByBites([], userId);

      expect(result).toEqual([]);
    });

    it('should not spend a read', async () => {
      await loadLikesByBites([], userId);

      expect(FirebaseFirestore.getCollectionGroup).not.toHaveBeenCalled();
    });
  });

  describe('given bites without id', () => {
    it('should return an empty array', async () => {
      const result = await loadLikesByBites([{} as Bite], userId);

      expect(result).toEqual([]);
    });
  });

  describe('given bites with id', () => {
    it("should return the current user's like per bite", async () => {
      const bites = [{ id: 'bite1' }, { id: 'bite2' }] as Bite[];
      const likeForBite1 = { userId, biteId: 'bite1', likeType: 'thumbup' };

      jest
        .spyOn(FirebaseFirestore, 'getCollectionGroup')
        .mockResolvedValue(snapshotsOf(likeForBite1));

      const result = await loadLikesByBites(bites, userId);

      expect(result).toEqual([likeForBite1]);
    });

    /**
     * The whole point of the change: cost is one query, not one read per Bite.
     * See GitHub issue #1357.
     */
    it('should read the likes in a single collection group query', async () => {
      const bites = Array.from({ length: 50 }, (_, i) => ({
        id: `bite${i}`,
      })) as Bite[];

      jest
        .spyOn(FirebaseFirestore, 'getCollectionGroup')
        .mockResolvedValue(snapshotsOf());

      await loadLikesByBites(bites, userId);

      expect(FirebaseFirestore.getCollectionGroup).toHaveBeenCalledTimes(1);
      expect(FirebaseFirestore.getCollectionGroup).toHaveBeenCalledWith({
        reference: 'likes',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            { type: 'where', fieldPath: 'userId', opStr: '==', value: userId },
          ],
        },
      });
    });

    it('should drop likes that belong to bites outside the feed', async () => {
      const bites = [{ id: 'bite1' }] as Bite[];
      const likeForBite1 = { userId, biteId: 'bite1', likeType: 'thumbup' };
      const likeElsewhere = { userId, biteId: 'other', likeType: 'drooling' };

      jest
        .spyOn(FirebaseFirestore, 'getCollectionGroup')
        .mockResolvedValue(snapshotsOf(likeForBite1, likeElsewhere));

      const result = await loadLikesByBites(bites, userId);

      expect(result).toEqual([likeForBite1]);
    });

    it('should ignore empty documents', async () => {
      const bites = [{ id: 'bite1' }] as Bite[];

      jest
        .spyOn(FirebaseFirestore, 'getCollectionGroup')
        .mockResolvedValue(snapshotsOf(null));

      const result = await loadLikesByBites(bites, userId);

      expect(result).toEqual([]);
    });
  });
});
