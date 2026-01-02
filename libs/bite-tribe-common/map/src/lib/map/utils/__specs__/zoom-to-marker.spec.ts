import { zoomToMarkers } from '../zoom-to-markers';
import { DEFAULT_ZOOM } from '../../model/default-zoom';
import { vi } from 'vitest';

const zoomToGpsOrDefaultMock = vi.fn();
vi.mock('../zoom-to-gps-or-default', () => ({
  zoomToGpsOrDefault: (): void => zoomToGpsOrDefaultMock(),
}));

describe('zoomToMarkers', () => {
  let mockMap: any;
  let mockMarkers: any[];

  beforeEach(() => {
    mockMap = {
      setView: vi.fn(),
      fitBounds: vi.fn(),
      getZoom: vi.fn(),
    };
    mockMarkers = [{}, {}]; // Mock markers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
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
    vi.runAllTimers();

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
    vi.runAllTimers();

    expect(zoomToGpsOrDefaultMock).toHaveBeenCalled();
  });
});
