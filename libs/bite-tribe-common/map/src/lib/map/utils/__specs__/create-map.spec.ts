import { createMap } from '../create-map';

describe('createMap', () => {
  it('should create a Leaflet map instance', () => {
    const mockElement = {
      nativeElement: document.createElement('div'),
    } as any;

    const map = createMap(mockElement);

    expect(map).toBeDefined();
  });

  it('should create a map with zoom enabled by default', () => {
    const mockElement = {
      nativeElement: document.createElement('div'),
    } as any;

    const map = createMap(mockElement);

    expect(map.options.zoomControl).toBe(true);
    expect(map.options.scrollWheelZoom).toBe(true);
    expect(map.options.doubleClickZoom).toBe(true);
    expect(map.options.touchZoom).toBe(true);
    expect(map.options.boxZoom).toBe(true);
  });

  it('should create a map with zoom enabled when enableZoom is true', () => {
    const mockElement = {
      nativeElement: document.createElement('div'),
    } as any;

    const map = createMap(mockElement, true);

    expect(map.options.zoomControl).toBe(true);
    expect(map.options.scrollWheelZoom).toBe(true);
    expect(map.options.doubleClickZoom).toBe(true);
    expect(map.options.touchZoom).toBe(true);
    expect(map.options.boxZoom).toBe(true);
  });

  it('should create a map with zoom disabled when enableZoom is false', () => {
    const mockElement = {
      nativeElement: document.createElement('div'),
    } as any;

    const map = createMap(mockElement, false);

    expect(map.options.zoomControl).toBe(false);
    expect(map.options.scrollWheelZoom).toBe(false);
    expect(map.options.doubleClickZoom).toBe(false);
    expect(map.options.touchZoom).toBe(false);
    expect(map.options.boxZoom).toBe(false);
  });
});
