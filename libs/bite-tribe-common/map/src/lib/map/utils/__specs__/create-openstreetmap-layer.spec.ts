import { createOpenstreetmapLayer } from '../create-openstreetmap-layer';
import * as L from 'leaflet';

jest.mock('leaflet');
jest.mock('leaflet.markercluster');

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
