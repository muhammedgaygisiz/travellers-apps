import L from 'leaflet';
import { addMarkerLayer } from '../add-marker-layer';

jest.mock('leaflet');

describe('addMarkerLayer', () => {
  const map = {} as L.Map;
  const markers = [{} as L.Marker, {} as L.Marker];

  beforeEach(() => jest.clearAllMocks());

  it('clusters markers by default', () => {
    addMarkerLayer(markers, map, { clusterMarkers: true, showRoute: false });

    expect(L.markerClusterGroup).toHaveBeenCalledWith(undefined);
    expect(L.featureGroup).not.toHaveBeenCalled();
  });

  it('keeps the zero-radius cluster group when clustering is off', () => {
    addMarkerLayer(markers, map, { clusterMarkers: false, showRoute: false });

    expect(L.markerClusterGroup).toHaveBeenCalledWith({ maxClusterRadius: 0 });
  });

  it('never clusters the stops of a route', () => {
    addMarkerLayer(markers, map, { clusterMarkers: true, showRoute: true });

    expect(L.featureGroup).toHaveBeenCalledWith(markers);
    expect(L.markerClusterGroup).not.toHaveBeenCalled();
  });
});
