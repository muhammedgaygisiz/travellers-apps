import { getCloseBites } from '../get-close-bites';
import type { Bite } from 'model';

const haversineDistanceMock = jest.fn();
jest.mock('utils', () => ({
  haversineDistance: (): void => haversineDistanceMock(),
}));

describe('getCloseBites', () => {
  const bites = [
    {
      id: '1',
      position: { latitude: 40.712776, longitude: -74.005974 },
    },
    {
      id: '2',
      position: { latitude: 40.713776, longitude: -74.005974 },
    },
    {
      id: '3',
      position: { latitude: 34.052235, longitude: -118.243683 },
    },
    {
      id: '4',
      position: null,
    },
  ] as Bite[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return bites within 200 meters', () => {
    haversineDistanceMock
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(4500);

    const sourceBite = {
      id: 'source',
      position: { latitude: 40.712776, longitude: -74.005974 },
    } as Bite;
    const result = getCloseBites(sourceBite, bites);

    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([bites[0], bites[1]]));
    expect(haversineDistanceMock).toHaveBeenCalledTimes(3);
  });

  it('should return an empty array if no bites are within 200 meters', () => {
    haversineDistanceMock
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(400)
      .mockReturnValueOnce(4500);

    const sourceBite = {
      id: 'source',
      position: { latitude: 40.712776, longitude: -74.005974 },
    } as Bite;
    const result = getCloseBites(sourceBite, bites);

    expect(result).toHaveLength(0);
    expect(haversineDistanceMock).toHaveBeenCalledTimes(3);
  });

  it('should return all bites if sourceBite is undefined', () => {
    const result = getCloseBites(undefined, bites);
    expect(result).toEqual(bites);
    expect(haversineDistanceMock).not.toHaveBeenCalled();
  });

  it('should handle bites with null positions', () => {
    haversineDistanceMock.mockReturnValueOnce(0).mockReturnValueOnce(100);

    const sourceBite = {
      id: 'source',
      position: { latitude: 40.712776, longitude: -74.005974 },
    } as Bite;
    const result = getCloseBites(sourceBite, bites);

    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([bites[0], bites[1]]));
    expect(haversineDistanceMock).toHaveBeenCalledTimes(3);
  });
});
