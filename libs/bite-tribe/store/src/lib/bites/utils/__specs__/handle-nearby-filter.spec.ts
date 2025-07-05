import { handleNearbyFilter } from '../handle-nearby-filter';
import { Bite, Settings } from 'model';

describe('handleNearbyFilter', () => {
  it('should return all bites when no filters are applied', () => {
    const bites = [
      { id: '1', position: { latitude: 10, longitude: 20 }, distance: '5' },
      { id: '2', position: { latitude: 30, longitude: 40 }, distance: '15' },
    ] as Bite[];
    const filters = [] as string[];
    const gpsPosition = { latitude: 0, longitude: 0 };
    const appSettings = { nearby: 10000 } as Settings; // 10 km

    const result = handleNearbyFilter(filters, gpsPosition, appSettings, bites);
    expect(result).toEqual(bites);
  });

  it('should filter bites based on nearby distance', () => {
    const bites = [
      { id: '1', position: { latitude: 10, longitude: 20 }, distance: '5' },
      { id: '2', position: { latitude: 30, longitude: 40 }, distance: '15' },
    ] as Bite[];
    const filters = ['nearby'];
    const gpsPosition = { latitude: 0, longitude: 0 };
    const appSettings = { nearby: 10000 } as Settings; // 10 km

    const result = handleNearbyFilter(filters, gpsPosition, appSettings, bites);
    expect(result).toEqual([bites[0]]); // Only bite with distance <= 10 km
  });

  it('should not filter bites if nearby setting is not defined', () => {
    const bites = [
      { id: '1', position: { latitude: 10, longitude: 20 }, distance: '5' },
      { id: '2', position: { latitude: 30, longitude: 40 }, distance: '15' },
    ] as Bite[];
    const filters = ['nearby'];
    const gpsPosition = { latitude: 0, longitude: 0 };
    const appSettings = {} as Settings; // No nearby setting

    const result = handleNearbyFilter(filters, gpsPosition, appSettings, bites);
    expect(result).toEqual(bites); // No filtering applied
  });

  it('should handle empty bites array gracefully', () => {
    const bites = [] as Bite[];
    const filters = ['nearby'];
    const gpsPosition = { latitude: 0, longitude: 0 };
    const appSettings = { nearby: 10000 } as Settings; // 10 km

    const result = handleNearbyFilter(filters, gpsPosition, appSettings, bites);
    expect(result).toEqual([]);
  });
});
