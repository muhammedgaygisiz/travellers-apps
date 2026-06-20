import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { loadBitesByLocation } from '../load-bites-by-location';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

describe('loadBitesByLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({ data: [] });
  });

  it('should return empty array when no position is provided', async () => {
    const result = await loadBitesByLocation(undefined);

    expect(result).toEqual([]);
    expect(FirebaseFunctions.callByName).not.toHaveBeenCalled();
  });

  it('should call the Firebase function with the position coordinates', async () => {
    const bites = [
      {
        id: 'bite1',
        position: { latitude: 40.7128, longitude: -74.006 },
        name: 'Pizza',
        likes: [],
      },
    ];
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: bites });
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    };

    const result = await loadBitesByLocation(mockPosition);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadBitesByLocation',
      data: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    });
    expect(result).toEqual(bites);
  });

  it('should return empty array when the Firebase function fails', async () => {
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockRejectedValue(new Error('Function failed'));
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    };

    const result = await loadBitesByLocation(mockPosition);

    expect(result).toEqual([]);
  });
});
