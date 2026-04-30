import { removeGpsMarker } from '../remove-gps-marker';
import { GPS_MARKER_TAG } from '../add-gps-marker';
import L from 'leaflet';

jest.mock('leaflet');

describe('removeGpsMarker', () => {
  let map: L.Map;

  beforeEach(() => {
    const div = document.createElement('div');
    div.style.width = '400px';
    div.style.height = '400px';
    document.body.appendChild(div);
    map = L.map(div).setView([0, 0], 2);
  });

  it('should call map each layer', () => {
    removeGpsMarker(map);

    expect(map.eachLayer).toHaveBeenCalled();
  });

  it('should remove layers tagged with GPS_MARKER_TAG', () => {
    const mockRemoveLayer = jest.fn();
    const taggedLayer = { [GPS_MARKER_TAG]: true } as unknown as L.Layer;
    const untaggedLayer = {} as L.Layer;

    (map.eachLayer as jest.Mock).mockImplementation((callback) => {
      callback(taggedLayer);
      callback(untaggedLayer);
    });
    (map as any).removeLayer = mockRemoveLayer;

    removeGpsMarker(map);

    expect(mockRemoveLayer).toHaveBeenCalledTimes(1);
    expect(mockRemoveLayer).toHaveBeenCalledWith(taggedLayer);
  });

  it('should not remove layers without GPS_MARKER_TAG', () => {
    const mockRemoveLayer = jest.fn();
    const untaggedLayer = {} as L.Layer;

    (map.eachLayer as jest.Mock).mockImplementation((callback) => {
      callback(untaggedLayer);
    });
    (map as any).removeLayer = mockRemoveLayer;

    removeGpsMarker(map);

    expect(mockRemoveLayer).not.toHaveBeenCalled();
  });
});
