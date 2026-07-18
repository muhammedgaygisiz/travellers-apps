import { CalcDistancePipe } from '../calc-distance.pipe';
import type { Position } from '@capacitor/geolocation';

jest.mock('utils', () => ({
  haversineDistance: jest.fn(() => {
    return '3935.75'; // Mocked distance between NYC and LA in km
  }),
}));

describe(CalcDistancePipe.name, () => {
  const pipe = new CalcDistancePipe();

  it('should delegate to haversineDistance function', () => {
    const bitePosition = { latitude: 40.7128, longitude: -74.006 };
    const currentPosition = {
      timestamp: Date.now(),
      coords: {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 1,
        altitudeAccuracy: null,
        altitude: null,
        speed: null,
        heading: null,
      },
    } satisfies Position;

    const result = pipe.transform(bitePosition, currentPosition);

    expect(result).toBe('3935.75'); // Distance between NYC and LA in km
  });
});
