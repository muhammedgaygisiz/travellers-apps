import { clearMarkers } from '../clear-markers';

describe('clearMarkers', () => {
  let map: any;
  let markers: any[];

  beforeEach(() => {
    map = {
      removeLayer: jest.fn(),
    };
    markers = [{ id: 1 }, { id: 2 }, { id: 3 }];
  });

  it('should remove all markers from the map', () => {
    clearMarkers(markers, map);
    expect(map.removeLayer).toHaveBeenCalledTimes(markers.length);
    markers.forEach((marker, index) => {
      expect(map.removeLayer).toHaveBeenNthCalledWith(index + 1, marker);
    });
  });

  it('should not call removeLayer if there are no markers', () => {
    clearMarkers([], map);
    expect(map.removeLayer).not.toHaveBeenCalled();
  });
});
