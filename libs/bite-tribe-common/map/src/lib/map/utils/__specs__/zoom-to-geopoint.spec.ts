import { zoomToGeopoint } from '../zoom-to-geopoint';
import * as L from 'leaflet';
import { DEFAULT_ZOOM } from '../../model/default-zoom';

describe('zoomToGeopoint', () => {
  let map: L.Map;
  let setViewSpy: jest.SpyInstance;
  let getZoomSpy: jest.SpyInstance;

  beforeEach(() => {
    map = {
      getZoom: jest.fn(),
      setView: jest.fn(),
    } as unknown as L.Map;

    getZoomSpy = jest.spyOn(map, 'getZoom');
    setViewSpy = jest.spyOn(map, 'setView');
  });

  it('should set the view to the geopoint with current zoom', () => {
    const geopoint = { latitude: 40.7128, longitude: -74.006 };
    getZoomSpy.mockReturnValue(10);

    zoomToGeopoint(geopoint, map);

    expect(getZoomSpy).toHaveBeenCalled();
    expect(setViewSpy).toHaveBeenCalledWith([40.7128, -74.006], 10);
  });

  it('should set the view to the geopoint with default zoom if current zoom is undefined', () => {
    const geopoint = { latitude: 34.0522, longitude: -118.2437 };
    getZoomSpy.mockReturnValue(undefined);

    zoomToGeopoint(geopoint, map);

    expect(getZoomSpy).toHaveBeenCalled();
    expect(setViewSpy).toHaveBeenCalledWith([34.0522, -118.2437], DEFAULT_ZOOM);
  });
});
