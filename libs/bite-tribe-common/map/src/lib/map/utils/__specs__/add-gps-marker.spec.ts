import { addGpsMarker, GPS_MARKER_TAG, isGpsMarker } from '../add-gps-marker';
import { Geopoint } from 'model';
import L from 'leaflet';

jest.mock('leaflet');

const geopointToLatLngMock = jest.fn();
jest.mock('../geopoint-to-lat-lng', () => ({
  geopointToLatLng: (...args: any): void => geopointToLatLngMock(...args),
}));

describe('addGpsMarker', () => {
  let mockMap: any;
  let mockMarker: any;
  let mockGeopoint: Geopoint;

  beforeEach(() => {
    mockMap = {} as any;
    mockMarker = {
      addTo: jest.fn().mockReturnThis(),
    } as any;
    mockGeopoint = { latitude: 51.505, longitude: -0.09 };

    jest.spyOn(L, 'marker').mockReturnValue(mockMarker);
    geopointToLatLngMock.mockReturnValue([51.505, -0.09]);
  });

  it('should not add a marker if gpsPosition is null', () => {
    addGpsMarker(null as any, mockMap);
    expect(mockMarker.addTo).not.toHaveBeenCalled();
  });

  it('should not add a marker if map is null', () => {
    addGpsMarker(mockGeopoint, null as any);
    expect(mockMarker.addTo).not.toHaveBeenCalled();
  });

  it('should add a GPS user marker to the map at the correct location', () => {
    addGpsMarker(mockGeopoint, mockMap);

    expect(geopointToLatLngMock).toHaveBeenCalledWith(mockGeopoint);
    expect(L.marker).toHaveBeenCalledWith([51.505, -0.09], expect.objectContaining({ icon: expect.anything() }));
    expect(mockMarker.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('should use leaflet-usermarker CSS class for the icon', () => {
    addGpsMarker(mockGeopoint, mockMap);

    expect(L.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({ className: 'leaflet-usermarker' }),
    );
    expect(L.marker).toHaveBeenCalledWith(
      [51.505, -0.09],
      expect.objectContaining({ icon: expect.anything() }),
    );
  });

  it('should tag the marker with GPS_MARKER_TAG', () => {
    addGpsMarker(mockGeopoint, mockMap);

    expect(mockMarker[GPS_MARKER_TAG]).toBe(true);
  });
});

describe('isGpsMarker', () => {
  it('should return true for a layer tagged with GPS_MARKER_TAG', () => {
    const taggedLayer = { [GPS_MARKER_TAG]: true } as unknown as L.Layer;
    expect(isGpsMarker(taggedLayer)).toBe(true);
  });

  it('should return false for a layer without GPS_MARKER_TAG', () => {
    const untaggedLayer = {} as L.Layer;
    expect(isGpsMarker(untaggedLayer)).toBe(false);
  });

  it('should return false for a layer with GPS_MARKER_TAG set to false', () => {
    const layer = { [GPS_MARKER_TAG]: false } as unknown as L.Layer;
    expect(isGpsMarker(layer)).toBe(false);
  });
});
