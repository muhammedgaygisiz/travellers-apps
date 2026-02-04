import { createOpenstreetmapLayer } from '../create-openstreetmap-layer';

jest.mock('../leaflet-markercluster', () => ({
  L: {
    tileLayer: jest.fn(() => ({
      options: {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
        noWrap: true,
      },
    })),
  },
}));

describe('createOpenstreetmapLayer', () => {
  it('should create an OpenStreetMap tile layer with correct properties', () => {
    const layer: L.Layer = createOpenstreetmapLayer();

    expect(layer).toBeDefined();
    expect(layer.options).toBeDefined();

    const options = layer.options as any;
    expect(options.maxZoom).toBe(19);
    expect(options.attribution).toContain('© OpenStreetMap contributors');
    expect(options.noWrap).toBe(true);
  });
});
