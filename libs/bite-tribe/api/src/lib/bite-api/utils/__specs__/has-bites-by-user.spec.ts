import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { hasBitesByUser } from '../has-bites-by-user';

jest.mock('@capacitor-firebase/firestore');

describe('hasBitesByUser', () => {
  const getCollection = (snapshots: unknown[]): jest.SpyInstance =>
    jest
      .spyOn(FirebaseFirestore, 'getCollection')
      .mockResolvedValue({ snapshots } as Awaited<
        ReturnType<typeof FirebaseFirestore.getCollection>
      >);

  it("reads at most one of the user's Bites", async () => {
    const spy = getCollection([]);

    await hasBitesByUser('leela');

    expect(spy).toHaveBeenCalledWith({
      reference: 'bites',
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          { type: 'where', fieldPath: 'userId', opStr: '==', value: 'leela' },
        ],
      },
      queryConstraints: [{ type: 'limit', limit: 1 }],
    });
  });

  it('is true when the user has a Bite', async () => {
    getCollection([{ id: 'bite-1', data: {} }]);

    await expect(hasBitesByUser('leela')).resolves.toBe(true);
  });

  it('is false when the user has none', async () => {
    getCollection([]);

    await expect(hasBitesByUser('leela')).resolves.toBe(false);
  });
});
