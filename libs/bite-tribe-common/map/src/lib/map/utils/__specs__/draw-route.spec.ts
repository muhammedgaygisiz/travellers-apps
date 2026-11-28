import L from 'leaflet';
import { drawRoute } from '../draw-route';

jest.mock('leaflet');

describe('drawRoute', () => {
  const map = {} as L.Map;
  const addTo = jest.fn().mockReturnValue('line');

  beforeEach(() => {
    jest.mocked(L.polyline).mockReturnValue({ addTo } as unknown as L.Polyline);
    jest.mocked(L.polyline).mockClear();
    addTo.mockClear();
  });

  it('joins the positions in the order given and adds the line to the map', () => {
    const line = drawRoute(
      [
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 4 },
      ],
      map,
    );

    expect(L.polyline).toHaveBeenCalledWith(
      [
        [1, 2],
        [3, 4],
      ],
      expect.objectContaining({ interactive: false }),
    );
    expect(addTo).toHaveBeenCalledWith(map);
    expect(line).toBe('line');
  });

  it('draws nothing for a single stop', () => {
    expect(drawRoute([{ latitude: 1, longitude: 2 }], map)).toBeUndefined();
    expect(L.polyline).not.toHaveBeenCalled();
  });
});
