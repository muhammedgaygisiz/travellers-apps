import { fitMapToMarkers } from '../fit-map-to-markers';

describe('fitMapToMarkers', () => {
  let map: any;
  let markers: any[];
  let positions: any[];

  beforeEach(() => {
    map = {
      fitBounds: jest.fn(),
      setView: jest.fn(),
    };

    markers = [];
    positions = [];
  });

  it('should fit bounds when multiple markers are present', () => {
    markers = [{}, {}, {}];
    positions = [
      { latitude: 10, longitude: 20 },
      { latitude: 15, longitude: 25 },
      { latitude: 5, longitude: 30 },
    ];

    fitMapToMarkers(markers, positions, map);

    expect(map.fitBounds).toHaveBeenCalled();
  });

  it('should not fit bounds when one or no markers are present', () => {
    markers = [{}];
    positions = [{ latitude: 10, longitude: 20 }];

    fitMapToMarkers(markers, positions, map);

    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it('should handle null positions gracefully', () => {
    markers = [{}, {}];
    positions = null as any;

    fitMapToMarkers(markers, positions, map);

    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});
