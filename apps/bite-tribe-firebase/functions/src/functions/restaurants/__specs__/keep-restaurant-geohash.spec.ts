const update = jest.fn().mockResolvedValue(undefined);
const doc = jest.fn((): { update: jest.Mock } => ({ update }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): unknown => ({ collection: (): unknown => ({ doc }) }),
  FieldValue: { delete: (): string => 'DELETE' },
}));
jest.mock('../restaurant-authority', () => ({
  RESTAURANT_COLLECTION: 'restaurants',
}));
jest.mock('firebase-functions/firestore', () => ({
  onDocumentWritten: (_path: string, handler: unknown): unknown => handler,
}));

import { geohashForLocation } from 'geofire-common';
import { geohashFor, syncRestaurantGeohash } from '../keep-restaurant-geohash';

const MARIENPLATZ = { latitude: 48.137154, longitude: 11.576124 };
const HASH = geohashForLocation([MARIENPLATZ.latitude, MARIENPLATZ.longitude]);

/** See GitHub issue #2308. */
describe('keepRestaurantGeohash', () => {
  beforeEach(() => jest.clearAllMocks());

  it('derives the geohash from a usable position, and none otherwise', () => {
    expect(geohashFor({ position: MARIENPLATZ })).toBe(HASH);
    expect(geohashFor({})).toBeUndefined();
    expect(geohashFor({ position: { latitude: 'x', longitude: 1 } })).toBe(
      undefined,
    );
    expect(geohashFor({ position: { latitude: 91, longitude: 0 } })).toBe(
      undefined,
    );
  });

  it('writes the geohash of a restaurant that has none', async () => {
    expect(await syncRestaurantGeohash('r-1', { position: MARIENPLATZ })).toBe(
      true,
    );

    expect(doc).toHaveBeenCalledWith('r-1');
    expect(update).toHaveBeenCalledWith({ geohash: HASH });
  });

  it('rewrites a stale geohash after the restaurant moved', async () => {
    await syncRestaurantGeohash('r-1', {
      position: MARIENPLATZ,
      geohash: 'u0000000',
    });

    expect(update).toHaveBeenCalledWith({ geohash: HASH });
  });

  it('writes nothing when the geohash is already right, so its own write ends the loop', async () => {
    expect(
      await syncRestaurantGeohash('r-1', {
        position: MARIENPLATZ,
        geohash: HASH,
      }),
    ).toBe(false);

    expect(update).not.toHaveBeenCalled();
  });

  it('removes a geohash whose position no longer places the restaurant', async () => {
    await syncRestaurantGeohash('r-1', { geohash: HASH });

    expect(update).toHaveBeenCalledWith({ geohash: 'DELETE' });
  });
});
