import { addGpsMarker } from '../add-gps-marker';
import { GPS_MARKER_TAG } from '../gps-marker';
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

    (L as unknown as { userMarker: jest.Mock }).userMarker = jest
      .fn()
      .mockReturnValue(mockMarker);
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
    expect(
      (L as unknown as { userMarker: jest.Mock }).userMarker,
    ).toHaveBeenCalledWith(
      [51.505, -0.09],
      expect.objectContaining({ pulsing: true, smallIcon: true }),
    );
    expect(mockMarker.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('should create the GPS marker with leaflet-usermarker options', () => {
    addGpsMarker(mockGeopoint, mockMap);

    expect(
      (L as unknown as { userMarker: jest.Mock }).userMarker,
    ).toHaveBeenCalledWith(
      [51.505, -0.09],
      expect.objectContaining({ pulsing: true, smallIcon: true }),
    );
  });

  it('should tag the marker with GPS_MARKER_TAG', () => {
    addGpsMarker(mockGeopoint, mockMap);

    expect(mockMarker[GPS_MARKER_TAG]).toBe(true);
  });
});
