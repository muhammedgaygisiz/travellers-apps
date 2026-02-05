import { addGpsMarker } from '../add-gps-marker';
import { Geopoint } from 'model';

const geopointToLatLngMock = jest.fn();
jest.mock('../geopoint-to-lat-lng', () => ({
  geopointToLatLng: (...args: any): void => geopointToLatLngMock(...args),
}));

describe('addGpsMarker', () => {
  let mockMap: any;
  let mockCircle: any;
  let mockGeopoint: Geopoint;

  beforeEach(() => {
    mockMap = {
      getZoom: jest.fn().mockReturnValue(10),
      on: jest.fn(),
      createPane: jest.fn().mockReturnValue({ style: {} }),
    } as any;
    mockCircle = {
      setStyle: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      getRadius: jest.fn().mockReturnValue(15),
      setRadius: jest.fn(),
    } as any;
    mockGeopoint = { latitude: 51.505, longitude: -0.09 };

    jest.spyOn(require('leaflet'), 'circle').mockReturnValue(mockCircle);
    geopointToLatLngMock.mockReturnValue([51.505, -0.09]);
  });

  it('should not add a marker if gpsPosition is null', () => {
    addGpsMarker(null as any, mockMap);
    expect(mockCircle.addTo).not.toHaveBeenCalled();
  });

  it('should not add a marker if map is null', () => {
    addGpsMarker(mockGeopoint, null as any);
    expect(mockCircle.addTo).not.toHaveBeenCalled();
  });

  it('should add a GPS marker to the map at the correct location', () => {
    addGpsMarker(mockGeopoint, mockMap);

    expect(geopointToLatLngMock).toHaveBeenCalledWith(mockGeopoint);
    expect(mockCircle.setStyle).toHaveBeenCalledWith({
      stroke: true,
      color: 'white',
      fillColor: '#007AFF',
      fillOpacity: 100,
    });
    expect(mockCircle.addTo).toHaveBeenCalledWith(mockMap);
  });

  describe('given some zooms', () => {
    let zoomStartCallback: () => void;
    let zoomEndCallback: () => void;

    it('should resize the circle on zoom in', () => {
      addGpsMarker(mockGeopoint, mockMap);

      zoomStartCallback = mockMap.on.mock.calls.find(
        (call: any) => call[0] === 'zoomstart',
      )[1];
      zoomEndCallback = mockMap.on.mock.calls.find(
        (call: any) => call[0] === 'zoomend',
      )[1];

      mockMap.getZoom.mockReturnValue(9);
      zoomStartCallback();
      mockMap.getZoom.mockReturnValue(8);
      zoomEndCallback();

      expect(mockCircle.setRadius).toHaveBeenCalledWith(30);
    });

    it('should resize the circle on zoom out', () => {
      addGpsMarker(mockGeopoint, mockMap);

      zoomStartCallback = mockMap.on.mock.calls.find(
        (call: any) => call[0] === 'zoomstart',
      )[1];
      zoomEndCallback = mockMap.on.mock.calls.find(
        (call: any) => call[0] === 'zoomend',
      )[1];

      mockMap.getZoom.mockReturnValue(9);
      zoomStartCallback();
      mockMap.getZoom.mockReturnValue(10);
      zoomEndCallback();

      expect(mockCircle.setRadius).toHaveBeenCalledWith(7.5);
    });

    it('should resize the circle on zoom in when diff is exactly -1', () => {
      addGpsMarker(mockGeopoint, mockMap);

      zoomStartCallback = mockMap.on.mock.calls.find(
        (call: any) => call[0] === 'zoomstart',
      )[1];
      zoomEndCallback = mockMap.on.mock.calls.find(
        (call: any) => call[0] === 'zoomend',
      )[1];

      mockCircle.getRadius.mockReturnValue(20);

      mockMap.getZoom.mockReturnValue(10);
      zoomStartCallback();

      mockMap.getZoom.mockReturnValue(11);
      zoomEndCallback();

      expect(mockCircle.setRadius).toHaveBeenCalledWith(10);
    });
  });
});
