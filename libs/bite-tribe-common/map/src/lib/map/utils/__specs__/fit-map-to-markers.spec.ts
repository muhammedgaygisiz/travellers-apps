import { fitMapToMarkers } from '../fit-map-to-markers';
import L from 'leaflet';

jest.mock('leaflet');

describe('fitMapToMarkers', () => {
  describe('given less than 2 markers', () => {
    it('should not call fitBounds', () => {
      const map = {
        fitBounds: jest.fn(),
      } as any;

      fitMapToMarkers([], null, map);
      expect(map.fitBounds).not.toHaveBeenCalled();
    });
  });

  describe('given more then 1 marker but no positions', () => {
    it('should not call fitBounds', () => {
      const map = {
        fitBounds: jest.fn(),
      } as any;

      fitMapToMarkers([{} as any, {} as any], null, map);
      expect(map.fitBounds).not.toHaveBeenCalled();
    });
  });

  describe('given 2 markers and positions', () => {
    describe('in opposite sides of the world', () => {
      beforeEach(() => {
        jest.spyOn(L, 'latLngBounds').mockReturnValue({
          getWest: () => -190,
          getEast: () => 190,
        } as any);
      });

      it('should normalize longitudes and call fitBounds', () => {
        const map = {
          fitBounds: jest.fn(),
        } as any;

        const positions = [
          { latitude: 10, longitude: 170 },
          { latitude: -10, longitude: -170 },
        ];

        fitMapToMarkers([{} as any, {} as any], positions, map);
        expect(map.fitBounds).toHaveBeenCalled();
      });
    });

    describe('in same side of the world', () => {
      beforeEach(() => {
        jest.spyOn(L, 'latLngBounds').mockReturnValue({
          getWest: () => -100,
          getEast: () => 100,
        } as any);
      });

      it('should call fitBounds with original bounds', () => {
        const map = {
          fitBounds: jest.fn(),
        } as any;

        const positions = [
          { latitude: 10, longitude: 50 },
          { latitude: -10, longitude: -50 },
        ];

        fitMapToMarkers([{} as any, {} as any], positions, map);
        expect(map.fitBounds).toHaveBeenCalled();
      });
    });
  });
});
