import { zoomToMarkers } from '../zoom-to-markers';
import { DEFAULT_ZOOM } from '../../model/default-zoom';

const zoomToGpsOrDefaultMock = jest.fn();
jest.mock('../zoom-to-gps-or-default', () => ({
  zoomToGpsOrDefault: (): void => zoomToGpsOrDefaultMock(),
}));

describe('zoomToMarkers', () => {
  let mockMap: any;
  let mockMarkers: any[];

  beforeEach(() => {
    mockMap = {
      setView: jest.fn(),
      fitBounds: jest.fn(),
      getZoom: jest.fn(),
    };
    mockMarkers = [{}, {}]; // Mock markers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should zoom to the first geopoint if only one geopoint is provided', () => {
    const geopoints = [{ latitude: 51.505, longitude: -0.09 }];
    const gpsPosition = null;

    zoomToMarkers(gpsPosition, geopoints, mockMarkers, mockMap);

    expect(mockMap.setView).toHaveBeenCalledWith([51.505, -0.09], DEFAULT_ZOOM);
    expect(zoomToGpsOrDefaultMock).not.toHaveBeenCalled();
  });

  it('should zoom to the first geopoint and then fit to all markers if multiple geopoints are provided', () => {
    const geopoints = [
      { latitude: 51.505, longitude: -0.09 },
      { latitude: 52.505, longitude: -1.09 },
    ];
    const gpsPosition = null;

    zoomToMarkers(gpsPosition, geopoints, mockMarkers, mockMap);

    expect(mockMap.setView).toHaveBeenCalledWith([51.505, -0.09], DEFAULT_ZOOM);

    // Fast-forward time to trigger the setTimeout
    jest.runAllTimers();

    expect(zoomToGpsOrDefaultMock).toHaveBeenCalled();
  });

  it('should call zoomToGpsOrDefault if gpsPosition is provided and multiple geopoints exist', () => {
    const geopoints = [
      { latitude: 51.505, longitude: -0.09 },
      { latitude: 52.505, longitude: -1.09 },
    ];
    const gpsPosition = { latitude: 53.505, longitude: -2.09 };

    zoomToMarkers(gpsPosition, geopoints, mockMarkers, mockMap);

    expect(mockMap.setView).toHaveBeenCalledWith([51.505, -0.09], DEFAULT_ZOOM);

    // Fast-forward time to trigger the setTimeout
    jest.runAllTimers();

    expect(zoomToGpsOrDefaultMock).toHaveBeenCalled();
  });
});
