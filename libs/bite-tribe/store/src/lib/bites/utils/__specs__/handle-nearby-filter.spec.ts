import { handleNearbyFilter } from '../handle-nearby-filter';
import { Bite } from 'model';

describe('handleNearbyFilter', () => {
  it('should return all bites when no filters are applied', () => {
    const bites = [
      { id: '1', position: { latitude: 10, longitude: 20 }, distance: '5' },
      { id: '2', position: { latitude: 30, longitude: 40 }, distance: '15' },
    ] as Bite[];
    const gpsPosition = { latitude: 0, longitude: 0 };

    const result = handleNearbyFilter(undefined, gpsPosition, bites);
    expect(result).toEqual(bites);
  });

  it('should filter bites based on nearby distance', () => {
    const bites = [
      { id: '1', position: { latitude: 10, longitude: 20 }, distance: '5' },
      { id: '2', position: { latitude: 30, longitude: 40 }, distance: '15' },
    ] as Bite[];
    const gpsPosition = { latitude: 0, longitude: 0 };

    const result = handleNearbyFilter(10000, gpsPosition, bites);
    expect(result).toEqual([bites[0]]); // Only bite with distance <= 10 km
  });

  it('should handle empty bites array gracefully', () => {
    const bites = [] as Bite[];
    const gpsPosition = { latitude: 0, longitude: 0 };

    const result = handleNearbyFilter(10000, gpsPosition, bites);
    expect(result).toEqual([]);
  });
});
