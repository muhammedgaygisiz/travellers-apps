import { zoomToGpsOrDefault } from '../zoom-to-gps-or-default';
import L from 'leaflet';
import { Geopoint } from 'model';

jest.mock('leaflet');

const GEOPOINT_SAN_FRANCISCO: Geopoint = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const COORD_SAN_FRANCISCO: L.LatLngTuple = [37.7749, -122.4194];
const COORD_LOS_ANGELES: L.LatLngTuple = [34.0522, -118.2437];

const addGpsMarkerMock = jest.fn();
jest.mock('../add-gps-marker', () => ({
  addGpsMarker: (...args: unknown[]): void => addGpsMarkerMock(...args),
}));

const removeGpsMarkerMock = jest.fn();
jest.mock('../remove-gps-marker', () => ({
  removeGpsMarker: (...args: unknown[]): void => removeGpsMarkerMock(...args),
}));

const zoomToGeopointMock = jest.fn();
jest.mock('../zoom-to-geopoint', () => ({
  zoomToGeopoint: (...args: unknown[]): void => zoomToGeopointMock(...args),
}));

describe('zoomToGpsOrDefault', () => {
  let map: L.Map;
  let markers: L.Marker[];
  let positions: { latitude: number; longitude: number }[];
  let fitBoundsSpy: jest.SpyInstance;

  beforeEach(() => {
    map = L.map(document.createElement('div')).setView([0, 0], 2);
    jest.spyOn(map, 'setView');
    jest.spyOn(map, 'getZoom').mockReturnValue(10);
    fitBoundsSpy = jest.spyOn(map, 'fitBounds').mockImplementation(() => map);

    markers = [];
    positions = [];
  });

  afterEach(() => {
    map.remove();
    addGpsMarkerMock.mockClear();
    removeGpsMarkerMock.mockClear();
  });

  it('should do nothing if map is null', () => {
    const gpsPosition = GEOPOINT_SAN_FRANCISCO;
    const nullMap = null;

    zoomToGpsOrDefault(gpsPosition, markers, positions, nullMap);

    expect(zoomToGeopointMock).not.toHaveBeenCalled();
    expect(addGpsMarkerMock).not.toHaveBeenCalled();
    expect(removeGpsMarkerMock).not.toHaveBeenCalled();
  });

  it('should set view to GPS position if valid GPS position is provided', () => {
    const gpsPosition = GEOPOINT_SAN_FRANCISCO;

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(zoomToGeopointMock).toHaveBeenCalledTimes(1);
    expect(zoomToGeopointMock).toHaveBeenCalledWith(gpsPosition, map);
  });

  it('should add GPS position marker', () => {
    const gpsPosition = GEOPOINT_SAN_FRANCISCO;

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(addGpsMarkerMock).toHaveBeenCalledTimes(1);
    expect(addGpsMarkerMock).toHaveBeenCalledWith(gpsPosition, map);
  });

  /**
   * The bite maps recenter on the device through this helper, so the position
   * source modal was given an explicit focus input instead of a change here.
   * See GitHub issue #1306.
   */
  it('should keep the gps position ahead of the markers', () => {
    markers.push(L.marker(COORD_SAN_FRANCISCO));
    markers.push(L.marker(COORD_LOS_ANGELES));
    positions.push({ latitude: 37.7749, longitude: -122.4194 });
    positions.push({ latitude: 34.0522, longitude: -118.2437 });

    zoomToGpsOrDefault(GEOPOINT_SAN_FRANCISCO, markers, positions, map);

    expect(zoomToGeopointMock).toHaveBeenCalledWith(
      GEOPOINT_SAN_FRANCISCO,
      map,
    );
    expect(fitBoundsSpy).not.toHaveBeenCalled();
  });

  describe('given gps position is null', () => {
    it('should fit map to markers', () => {
      const gpsPosition = null;

      markers.push(L.marker(COORD_SAN_FRANCISCO));
      markers.push(L.marker(COORD_LOS_ANGELES));
      positions.push({ latitude: 37.7749, longitude: -122.4194 });
      positions.push({ latitude: 34.0522, longitude: -118.2437 });

      zoomToGpsOrDefault(gpsPosition, markers, positions, map);

      expect(fitBoundsSpy).toHaveBeenCalled();
    });
  });

  it('should remove GPS position marker if GPS position is null', () => {
    const gpsPosition = null;

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(removeGpsMarkerMock).toHaveBeenCalledTimes(1);
    expect(removeGpsMarkerMock).toHaveBeenCalledWith(map);
  });

  describe('given gps position is undefined', () => {
    it('should fit map to markers', () => {
      const gpsPosition = undefined;

      markers.push(L.marker(COORD_SAN_FRANCISCO));
      markers.push(L.marker(COORD_LOS_ANGELES));
      positions.push({ latitude: 37.7749, longitude: -122.4194 });
      positions.push({ latitude: 34.0522, longitude: -118.2437 });

      zoomToGpsOrDefault(gpsPosition, markers, positions, map);

      expect(fitBoundsSpy).toHaveBeenCalled();
    });
  });

  it('should fit map to markers if GPS position is missing latitude', () => {
    const gpsPosition = {
      latitude: null as unknown as number,
      longitude: -122.4194,
    };

    markers.push(L.marker(COORD_SAN_FRANCISCO));
    markers.push(L.marker(COORD_LOS_ANGELES));
    positions.push({ latitude: 37.7749, longitude: -122.4194 });
    positions.push({ latitude: 34.0522, longitude: -118.2437 });

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(fitBoundsSpy).toHaveBeenCalled();
  });
});
