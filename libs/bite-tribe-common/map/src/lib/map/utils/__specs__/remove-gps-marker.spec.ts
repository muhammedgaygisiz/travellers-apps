import { removeGpsMarker } from '../remove-gps-marker';
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
});
