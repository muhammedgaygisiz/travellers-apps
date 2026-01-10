import { loadBitesByLocation } from '../load-bites-by-location';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCollection: jest.fn(),
  },
}));

jest.mock('geofire-common', () => ({
  geohashQueryBounds: jest.fn(),
  distanceBetween: jest.fn(),
}));

jest.mock('../../../utils/to-bite', () => ({
  toBite: jest.fn((doc) => ({
    id: doc.id,
    position: doc.data.position,
    likes: [],
    ...doc.data,
  })),
}));

describe('loadBitesByLocation', () => {
  let getCollectionSpy: jest.SpyInstance;
  let geohashQueryBoundsSpy: jest.Mock;
  let distanceBetweenSpy: jest.Mock;

  beforeEach(() => {
    getCollectionSpy = jest
      .spyOn(FirebaseFirestore, 'getCollection')
      .mockResolvedValue({ snapshots: [] });

    geohashQueryBoundsSpy = geohashQueryBounds as jest.Mock;
    distanceBetweenSpy = distanceBetween as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no position is provided', () => {
    it('should return empty array', async () => {
      const result = await loadBitesByLocation(undefined);

      expect(result).toEqual([]);
      expect(getCollectionSpy).not.toHaveBeenCalled();
    });
  });

  describe('when position is provided', () => {
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

    describe('and there are no matching bounds', () => {
      beforeEach(() => {
        geohashQueryBoundsSpy.mockReturnValue([]);
      });

      it('should return empty array', async () => {
        const result = await loadBitesByLocation(mockPosition);

        expect(result).toEqual([]);
        expect(geohashQueryBoundsSpy).toHaveBeenCalledWith(
          [40.7128, -74.006],
          15000,
        );
      });
    });

    describe('and there is one bound', () => {
      beforeEach(() => {
        geohashQueryBoundsSpy.mockReturnValue([['bound1Start', 'bound1End']]);
      });

      describe('with no snapshots', () => {
        beforeEach(() => {
          getCollectionSpy.mockResolvedValue({ snapshots: [] });
        });

        it('should return empty array', async () => {
          const result = await loadBitesByLocation(mockPosition);

          expect(result).toEqual([]);
          expect(getCollectionSpy).toHaveBeenCalledTimes(1);
          expect(getCollectionSpy).toHaveBeenCalledWith({
            reference: 'bites',
            compositeFilter: {
              type: 'and',
              queryConstraints: [
                {
                  type: 'where',
                  fieldPath: 'geohash',
                  opStr: '>=',
                  value: 'bound1Start',
                },
                {
                  type: 'where',
                  fieldPath: 'geohash',
                  opStr: '<=',
                  value: 'bound1End',
                },
              ],
            },
            queryConstraints: [
              {
                type: 'orderBy',
                fieldPath: 'geohash',
                directionStr: 'asc',
              },
            ],
          });
        });
      });

      describe('with snapshots within radius', () => {
        beforeEach(() => {
          getCollectionSpy.mockResolvedValue({
            snapshots: [
              {
                id: 'bite1',
                data: {
                  position: { latitude: 40.7128, longitude: -74.006 },
                  name: 'Pizza',
                },
              },
            ],
          });
          distanceBetweenSpy.mockReturnValue(10); // 10km = 10000m (within 15km radius)
        });

        it('should return matching bites', async () => {
          const result = await loadBitesByLocation(mockPosition);

          expect(result).toEqual([
            {
              id: 'bite1',
              position: { latitude: 40.7128, longitude: -74.006 },
              name: 'Pizza',
              likes: [],
            },
          ]);
          expect(distanceBetweenSpy).toHaveBeenCalledWith(
            [40.7128, -74.006],
            [40.7128, -74.006],
          );
        });
      });

      describe('with snapshots outside radius', () => {
        beforeEach(() => {
          getCollectionSpy.mockResolvedValue({
            snapshots: [
              {
                id: 'bite1',
                data: {
                  position: { latitude: 40.7128, longitude: -74.006 },
                  name: 'Pizza',
                },
              },
            ],
          });
          distanceBetweenSpy.mockReturnValue(20); // 20km = 20000m (outside 15km radius)
        });

        it('should filter out bites outside radius', async () => {
          const result = await loadBitesByLocation(mockPosition);

          expect(result).toEqual([]);
        });
      });
    });

    describe('and there are multiple bounds', () => {
      beforeEach(() => {
        geohashQueryBoundsSpy.mockReturnValue([
          ['bound1Start', 'bound1End'],
          ['bound2Start', 'bound2End'],
          ['bound3Start', 'bound3End'],
        ]);
      });

      describe('with snapshots from multiple bounds', () => {
        beforeEach(() => {
          getCollectionSpy
            .mockResolvedValueOnce({
              snapshots: [
                {
                  id: 'bite1',
                  data: {
                    position: { latitude: 40.7128, longitude: -74.006 },
                    name: 'Pizza',
                  },
                },
              ],
            })
            .mockResolvedValueOnce({
              snapshots: [
                {
                  id: 'bite2',
                  data: {
                    position: { latitude: 40.7129, longitude: -74.007 },
                    name: 'Burger',
                  },
                },
              ],
            })
            .mockResolvedValueOnce({
              snapshots: [
                {
                  id: 'bite3',
                  data: {
                    position: { latitude: 40.713, longitude: -74.008 },
                    name: 'Sushi',
                  },
                },
              ],
            });
          distanceBetweenSpy
            .mockReturnValueOnce(5) // 5km
            .mockReturnValueOnce(10) // 10km
            .mockReturnValueOnce(18); // 18km (outside radius)
        });

        it('should query all bounds and return bites within radius', async () => {
          const result = await loadBitesByLocation(mockPosition);

          expect(getCollectionSpy).toHaveBeenCalledTimes(3);
          expect(result).toEqual([
            {
              id: 'bite1',
              position: { latitude: 40.7128, longitude: -74.006 },
              name: 'Pizza',
              likes: [],
            },
            {
              id: 'bite2',
              position: { latitude: 40.7129, longitude: -74.007 },
              name: 'Burger',
              likes: [],
            },
          ]);
        });
      });

      describe('when a bound query fails', () => {
        beforeEach(() => {
          getCollectionSpy
            .mockResolvedValueOnce({
              snapshots: [
                {
                  id: 'bite1',
                  data: {
                    position: { latitude: 40.7128, longitude: -74.006 },
                    name: 'Pizza',
                  },
                },
              ],
            })
            .mockRejectedValueOnce(new Error('Firebase error'))
            .mockResolvedValueOnce({
              snapshots: [
                {
                  id: 'bite3',
                  data: {
                    position: { latitude: 40.713, longitude: -74.008 },
                    name: 'Sushi',
                  },
                },
              ],
            });
          distanceBetweenSpy.mockReturnValue(5); // All within radius
        });

        it('should handle errors gracefully and return other results', async () => {
          const result = await loadBitesByLocation(mockPosition);

          expect(getCollectionSpy).toHaveBeenCalledTimes(3);
          expect(result).toEqual([
            {
              id: 'bite1',
              position: { latitude: 40.7128, longitude: -74.006 },
              name: 'Pizza',
              likes: [],
            },
            {
              id: 'bite3',
              position: { latitude: 40.713, longitude: -74.008 },
              name: 'Sushi',
              likes: [],
            },
          ]);
        });
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        geohashQueryBoundsSpy.mockReturnValue([['bound1Start', 'bound1End']]);
      });

      it('should handle bites exactly at the radius boundary', async () => {
        getCollectionSpy.mockResolvedValue({
          snapshots: [
            {
              id: 'bite1',
              data: {
                position: { latitude: 40.7128, longitude: -74.006 },
                name: 'Pizza',
              },
            },
          ],
        });
        distanceBetweenSpy.mockReturnValue(15); // Exactly 15km = 15000m

        const result = await loadBitesByLocation(mockPosition);

        expect(result).toEqual([
          {
            id: 'bite1',
            position: { latitude: 40.7128, longitude: -74.006 },
            name: 'Pizza',
            likes: [],
          },
        ]);
      });

      it('should handle empty snapshots array', async () => {
        getCollectionSpy.mockResolvedValue({ snapshots: [] });

        const result = await loadBitesByLocation(mockPosition);

        expect(result).toEqual([]);
      });

      it('should handle multiple snapshots in a single bound', async () => {
        getCollectionSpy.mockResolvedValue({
          snapshots: [
            {
              id: 'bite1',
              data: {
                position: { latitude: 40.7128, longitude: -74.006 },
                name: 'Pizza',
              },
            },
            {
              id: 'bite2',
              data: {
                position: { latitude: 40.7129, longitude: -74.007 },
                name: 'Burger',
              },
            },
            {
              id: 'bite3',
              data: {
                position: { latitude: 40.713, longitude: -74.008 },
                name: 'Sushi',
              },
            },
          ],
        });
        distanceBetweenSpy
          .mockReturnValueOnce(5)
          .mockReturnValueOnce(10)
          .mockReturnValueOnce(12);

        const result = await loadBitesByLocation(mockPosition);

        expect(result).toHaveLength(3);
        expect(result.map((b) => b.id)).toEqual(['bite1', 'bite2', 'bite3']);
      });
    });
  });
});
