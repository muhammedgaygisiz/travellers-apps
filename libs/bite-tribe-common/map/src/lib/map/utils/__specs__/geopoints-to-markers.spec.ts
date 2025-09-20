import { geopointsToMarkers } from '../geopoints-to-markers';
import * as L from 'leaflet';
import { MarkerColor } from '../../model/marker-color.enum';

const getMarkerWithColorMock = jest.fn();
jest.mock('../get-marker-with-color', () => ({
  getMarkerWithColor: (...args: any): void => getMarkerWithColorMock(...args),
}));

describe('geopointsToMarkers', () => {
  let map: L.Map;
  let geopoints: { latitude: number; longitude: number }[];

  beforeEach(() => {
    map = {
      addLayer: jest.fn(),
    } as any;

    geopoints = [
      { latitude: 40.7128, longitude: -74.006 },
      { latitude: 34.0522, longitude: -118.2437 },
    ];
  });

  it('should convert geopoints to markers and add them to the map', () => {
    const markers = geopointsToMarkers(geopoints, map);

    expect(markers.length).toBe(2);
    expect(markers[0].getLatLng()).toEqual({ lat: 40.7128, lng: -74.006 });
    expect(markers[1].getLatLng()).toEqual({ lat: 34.0522, lng: -118.2437 });
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.RED);
  });

  it('should return an empty array when given an empty geopoints array', () => {
    const markers = geopointsToMarkers([], map);
    expect(markers.length).toBe(0);
  });

  it('should handle geopoints with ids', () => {
    const geopointsWithoutIds = [
      { latitude: 51.5074, longitude: -0.1278, id: '1' },
    ];
    const markers = geopointsToMarkers(geopointsWithoutIds, map);
    expect(markers.length).toBe(1);
    expect(markers[0].getLatLng()).toEqual({ lat: 51.5074, lng: -0.1278 });
    expect(markers[0].options.title).toBe('1');
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.RED);
  });
});
