import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { GooglePlace } from 'model';
import { searchPlaces } from '../search-places';
import { searchNearbyPlaces } from '../search-nearby-places';
import { getPlaceDetails } from '../get-place-details';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

const POSITION = { latitude: 40.85, longitude: 14.26 };

const PLACES: GooglePlace[] = [
  {
    placeId: 'place-1',
    name: 'Trattoria Roma',
    address: 'Via Roma 1, Napoli',
    position: POSITION,
  },
] as GooglePlace[];

/**
 * Google Places API (New) never sees the app: every place lookup goes to a
 * callable, which is what attaches the App Check token and the signed-in user
 * the backend requires before it spends the backend-only Maps key. Calling
 * Google directly from here would move the traffic outside that verified
 * boundary, so these specs pin the callable route. See GitHub issue #1245.
 */
describe('place lookups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
      data: PLACES,
    });
  });

  describe('searchPlaces', () => {
    it('should ask the backend for places matching the search text', async () => {
      const result = await searchPlaces('pizza', POSITION);

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'searchPlaces',
        data: { searchText: 'pizza', position: POSITION },
      });
      expect(result).toEqual(PLACES);
    });

    it('should ask without a position when the device has none', async () => {
      await searchPlaces('pizza');

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'searchPlaces',
        data: { searchText: 'pizza' },
      });
    });

    it('should resolve to no places when the call fails', async () => {
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockRejectedValue(new Error('Function failed'));

      await expect(searchPlaces('pizza', POSITION)).resolves.toEqual([]);
    });
  });

  describe('searchNearbyPlaces', () => {
    it('should ask the backend for places around the position', async () => {
      const result = await searchNearbyPlaces(POSITION);

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'searchNearbyPlaces',
        data: { position: POSITION },
      });
      expect(result).toEqual(PLACES);
    });

    it('should resolve to no places when the call fails', async () => {
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockRejectedValue(new Error('Function failed'));

      await expect(searchNearbyPlaces(POSITION)).resolves.toEqual([]);
    });
  });

  describe('getPlaceDetails', () => {
    it('should ask the backend for the details of a place', async () => {
      await getPlaceDetails('place-1');

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'getPlaceDetails',
        data: { placeId: 'place-1' },
      });
    });

    it('should resolve to undefined when the call fails', async () => {
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockRejectedValue(new Error('Function failed'));

      await expect(getPlaceDetails('place-1')).resolves.toBeUndefined();
    });
  });
});
