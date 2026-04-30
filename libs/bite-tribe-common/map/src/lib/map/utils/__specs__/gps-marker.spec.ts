import { GPS_MARKER_TAG, isGpsMarker } from '../gps-marker';
import L from 'leaflet';

jest.mock('leaflet');

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
