import { zoomToGpsOrDefault } from '../zoom-to-gps-or-default';
import * as L from 'leaflet';
import { Geopoint } from 'model';

const GEOPOINT_SAN_FRANCISCO: Geopoint = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const COORD_SAN_FRANCISCO: L.LatLngTuple = [37.7749, -122.4194];
const COORD_LOS_ANGELES: L.LatLngTuple = [34.0522, -118.2437];

const addGpsMarkerMock = jest.fn();
jest.mock('../add-gps-marker', () => ({
  addGpsMarker: (...args: any): void => addGpsMarkerMock(...args),
}));

const removeGpsMarkerMock = jest.fn();
jest.mock('../remove-gps-marker', () => ({
  removeGpsMarker: (...args: any): void => removeGpsMarkerMock(...args),
}));

const zoomToGeopointMock = jest.fn();
jest.mock('../zoom-to-geopoint', () => ({
  zoomToGeopoint: (...args: any): void => zoomToGeopointMock(...args),
}));

describe('zoomToGpsOrDefault', () => {
  let map: L.Map;
  let markers: L.Marker[];
  let positions: { latitude: number; longitude: number }[];

  beforeEach(() => {
    map = L.map(document.createElement('div')).setView([0, 0], 2);
    jest.spyOn(map, 'setView');
    jest.spyOn(map, 'getZoom').mockReturnValue(10);

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
    const nullMap = null as any;

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

  it('should fit map to markers if GPS position is null', () => {
    const gpsPosition = null;

    markers.push(L.marker(COORD_SAN_FRANCISCO));
    markers.push(L.marker(COORD_LOS_ANGELES));
    positions.push({ latitude: 37.7749, longitude: -122.4194 });
    positions.push({ latitude: 34.0522, longitude: -118.2437 });

    const fitBoundsSpy = jest.spyOn(map, 'fitBounds');

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(fitBoundsSpy).toHaveBeenCalled();
  });

  it('should remove GPS position marker if GPS position is null', () => {
    const gpsPosition = null;

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(removeGpsMarkerMock).toHaveBeenCalledTimes(1);
    expect(removeGpsMarkerMock).toHaveBeenCalledWith(map);
  });

  it('should fit map to markers if GPS position is undefined', () => {
    const gpsPosition = undefined;

    markers.push(L.marker(COORD_SAN_FRANCISCO));
    markers.push(L.marker(COORD_LOS_ANGELES));
    positions.push({ latitude: 37.7749, longitude: -122.4194 });
    positions.push({ latitude: 34.0522, longitude: -118.2437 });

    const fitBoundsSpy = jest.spyOn(map, 'fitBounds');

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(fitBoundsSpy).toHaveBeenCalled();
  });

  it('should fit map to markers if GPS position is missing latitude', () => {
    const gpsPosition = { latitude: null as any, longitude: -122.4194 };

    markers.push(L.marker(COORD_SAN_FRANCISCO));
    markers.push(L.marker(COORD_LOS_ANGELES));
    positions.push({ latitude: 37.7749, longitude: -122.4194 });
    positions.push({ latitude: 34.0522, longitude: -118.2437 });

    const fitBoundsSpy = jest.spyOn(map, 'fitBounds');

    zoomToGpsOrDefault(gpsPosition, markers, positions, map);

    expect(fitBoundsSpy).toHaveBeenCalled();
  });
});
