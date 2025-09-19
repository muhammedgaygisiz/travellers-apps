import { createMap } from '../create-map';

describe('createMap', () => {
  it('should create a Leaflet map instance', () => {
    const mockElement = {
      nativeElement: document.createElement('div'),
    } as any;

    const map = createMap(mockElement);

    expect(map).toBeDefined();
  });
});
