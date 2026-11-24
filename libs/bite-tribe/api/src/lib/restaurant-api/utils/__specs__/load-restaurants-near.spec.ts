jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { getCollection: jest.fn() },
}));

import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { loadRestaurantsNear } from '../load-restaurants-near';

const MARIENPLATZ = { latitude: 48.137154, longitude: 11.576124 };
const snapshot = (
  id: string,
  position: { latitude: number; longitude: number },
): { id: string; data: Record<string, unknown> } => ({
  id,
  data: { name: id, position },
});

/** See GitHub issue #2308. */
describe('loadRestaurantsNear', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads by geohash range and keeps what lies within the radius, once', async () => {
    const near = snapshot('near', { latitude: 48.138, longitude: 11.577 });
    const far = snapshot('far', { latitude: 48.4, longitude: 11.9 });
    jest
      .mocked(FirebaseFirestore.getCollection)
      .mockResolvedValue({ snapshots: [near, far, near] } as never);

    const found = await loadRestaurantsNear(MARIENPLATZ, 2_000);

    expect(found.map((restaurant) => restaurant.id)).toEqual(['near']);
    const [request] = jest.mocked(FirebaseFirestore.getCollection).mock
      .calls[0];
    expect(request.reference).toBe('restaurants');
    expect(
      request.compositeFilter?.queryConstraints.map(
        (constraint) => 'fieldPath' in constraint && constraint.fieldPath,
      ),
    ).toEqual(['geohash', 'geohash']);
  });

  it('skips a stored restaurant without a usable position', async () => {
    jest.mocked(FirebaseFirestore.getCollection).mockResolvedValue({
      snapshots: [{ id: 'broken', data: { name: 'Broken' } }],
    } as never);

    expect(await loadRestaurantsNear(MARIENPLATZ, 2_000)).toEqual([]);
  });
});
