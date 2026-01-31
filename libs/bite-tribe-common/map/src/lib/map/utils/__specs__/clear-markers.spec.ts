import { clearMarkers } from '../clear-markers';
import * as L from 'leaflet';
import 'leaflet.markercluster';

describe('clearMarkers', () => {
  let map: any;
  let markers: L.MarkerClusterGroup;

  beforeEach(() => {
    map = {
      removeLayer: jest.fn(),
    };
    markers = L.markerClusterGroup();
  });

  it('should remove all markers from the map', () => {
    clearMarkers(markers, map);
    expect(map.removeLayer).toHaveBeenCalledWith(markers);
  });

  it('should not call removeLayer if there are no markers', () => {
    clearMarkers(null as any, map);
    expect(map.removeLayer).not.toHaveBeenCalled();
  });
});
