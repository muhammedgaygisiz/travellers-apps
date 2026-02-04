import { removeGpsMarker } from '../remove-gps-marker';

jest.mock('../leaflet-markercluster');

describe('removeGpsMarker', () => {
  let map: L.Map;

  beforeEach(() => {
    const div = document.createElement('div');
    div.style.width = '400px';
    div.style.height = '400px';
    document.body.appendChild(div);
    map = L.map(div).setView([0, 0], 2);
  });

  afterEach(() => {
    map.remove();
  });

  it('should remove GPS marker (circle) from the map', () => {
    // Add a circle to the map to simulate a GPS marker
    L.circle([0, 0], { radius: 15 }).addTo(map);

    let circleCount = 0;
    map.eachLayer((layer) => {
      if (layer instanceof L.Circle) {
        circleCount++;
      }
    });
    expect(circleCount).toBe(1);

    removeGpsMarker(map);

    circleCount = 0;
    map.eachLayer((layer) => {
      if (layer instanceof L.Circle) {
        circleCount++;
      }
    });
    expect(circleCount).toBe(0);
  });
});
