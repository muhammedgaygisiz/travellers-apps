import { haversineDistance } from '../haversine-distance';

describe('haversineDistance', () => {
  it('should return undefined for missing coordinates', () => {
    expect(
      haversineDistance(undefined, undefined, undefined, undefined)
    ).toBeUndefined();
    expect(
      haversineDistance(52.2296756, undefined, 21.0122287, undefined)
    ).toBeUndefined();
    expect(
      haversineDistance(undefined, 21.0122287, 52.2296756, 21.0122287)
    ).toBeUndefined();
  });

  it('should calculate distance in kilometers', () => {
    const distance = haversineDistance(
      52.2296756,
      21.0122287,
      41.89193,
      12.51133
    );
    expect(distance).toBeDefined();

    if (distance) {
      expect(parseFloat(distance)).toBeCloseTo(1315.51, 2);
    }
  });

  it('should calculate distance in miles', () => {
    const distance = haversineDistance(
      52.2296756,
      21.0122287,
      41.89193,
      12.51133,
      'mi'
    );
    expect(distance).toBeDefined();

    if (distance) {
      expect(parseFloat(distance)).toBeCloseTo(817.43, 2);
    }
  });

  it('should handle edge cases with same coordinates', () => {
    const distance = haversineDistance(
      52.2296756,
      21.0122287,
      52.2296756,
      21.0122287
    );
    expect(distance).toBeDefined();

    if (distance) {
      expect(parseFloat(distance)).toBeCloseTo(0, 2);
    }
  });

  it('should handle invalid unit gracefully', () => {
    const distance = haversineDistance(
      52.2296756,
      21.0122287,
      41.89193,
      12.51133,
      'invalid'
    );
    expect(distance).toBeDefined();

    if (distance) {
      expect(parseFloat(distance)).toBeCloseTo(1315.51, 2); // Default to km
    }
  });
});
