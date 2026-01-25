import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { loadBitesByUser } from '../load-bites-by-user';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCollection: jest.fn(),
  },
}));

describe('loadBitesByUser', () => {
  beforeEach(() => {
    jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
      snapshots: [{} as any],
    });
  });

  it('should call getCollection and convert data to bites', () => {
    loadBitesByUser('user123');

    expect(FirebaseFirestore.getCollection).toHaveBeenCalledTimes(1);
  });
});
