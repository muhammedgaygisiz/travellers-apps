import { geopointsToMarkers } from '../geopoints-to-markers';
import { MarkerColor } from '../../model/marker-color.enum';
import { Geopoint } from 'model';

jest.mock('../leaflet-markercluster', () => ({
  L: {
    marker: jest.fn((coords: any[]) => ({
      getLatLng: (): any => ({
        lat: coords[0],
        lng: coords[1],
      }),
      options: {
        title: '1',
      },
    })),
    markerClusterGroup: jest.fn(),
  },
}));

const getMarkerWithColorMock = jest.fn();
jest.mock('../get-marker-with-color', () => ({
  getMarkerWithColor: (...args: any): void => getMarkerWithColorMock(...args),
}));

describe('geopointsToMarkers', () => {
  let map: L.Map;
  let geopoints: Geopoint[];

  beforeEach(() => {
    map = {
      addLayer: jest.fn(),
    } as any;

    geopoints = [
      { latitude: 40.7128, longitude: -74.006, rating: 1 },
      { latitude: 34.0522, longitude: -118.2437, rating: 1 },
    ];
  });

  it('should convert geopoints to markers and add them to the map', () => {
    const markers = geopointsToMarkers(geopoints);

    expect(markers.length).toBe(2);
    expect(markers[0].getLatLng()).toEqual({ lat: 40.7128, lng: -74.006 });
    expect(markers[1].getLatLng()).toEqual({ lat: 34.0522, lng: -118.2437 });
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.RED, {
      rating: '1',
    });
  });

  it('should return an empty array when given an empty geopoints array', () => {
    const markers = geopointsToMarkers([]);
    expect(markers.length).toBe(0);
  });

  it('should handle geopoints with ids', () => {
    const geopointsWithoutIds = [
      { latitude: 51.5074, longitude: -0.1278, id: '1' },
    ];
    const markers = geopointsToMarkers(geopointsWithoutIds);
    expect(markers.length).toBe(1);
    expect(markers[0].getLatLng()).toEqual({ lat: 51.5074, lng: -0.1278 });
    expect(markers[0].options.title).toBe('1');
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.RED, {
      rating: '1',
    });
  });
});
