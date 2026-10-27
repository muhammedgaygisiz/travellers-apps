import { geoCentroid } from 'd3';
import {
  centreOf,
  clampZoom,
  GlobeCamera,
  MAX_ZOOM,
  MIN_ZOOM,
} from '../globe-camera';
import { type CountryOutline, toCountryOutlines } from '../globe-outlines';
import { readWorldAtlas } from './world-atlas';

const outlines = toCountryOutlines(readWorldAtlas('coarse'));

const outlineOf = (countryCode: string): CountryOutline => {
  const outline = outlines.find((each) => each.countryCode === countryCode);

  if (!outline) {
    throw new Error(`No outline for ${countryCode}`);
  }

  return outline;
};

describe('GlobeCamera', () => {
  const size = 300;

  describe('clampZoom', () => {
    it('should keep the zoom between the whole globe and 12x', () => {
      expect(clampZoom(0.2)).toBe(MIN_ZOOM);
      expect(clampZoom(40)).toBe(MAX_ZOOM);
      expect(clampZoom(2.5)).toBe(2.5);
    });
  });

  describe('centreOf', () => {
    it('should give nothing for no countries', () => {
      expect(centreOf([])).toBeUndefined();
    });

    it('should give the country itself for one country', () => {
      const [lon, lat] = centreOf([outlineOf('AT')]) ?? [0, 0];
      const [austriaLon, austriaLat] = geoCentroid(outlineOf('AT').feature);

      expect(lon).toBeCloseTo(austriaLon, 5);
      expect(lat).toBeCloseTo(austriaLat, 5);
    });

    it('should average across the date line rather than through Africa', () => {
      const [lon] = centreOf([outlineOf('NZ'), outlineOf('FJ')]) ?? [0, 0];

      expect(Math.abs(lon)).toBeGreaterThan(160);
    });
  });

  describe('rotateBy', () => {
    it('should turn the globe east when dragged to the right', () => {
      const camera = new GlobeCamera(size);

      camera.rotateBy(50, 0);

      expect(camera.rotation[0]).toBeGreaterThan(0);
    });

    it('should turn slower the closer it is zoomed', () => {
      const whole = new GlobeCamera(size);
      const close = new GlobeCamera(size);

      close.zoomTo(4);
      whole.rotateBy(50, 0);
      close.rotateBy(50, 0);

      expect(close.rotation[0]).toBeCloseTo(whole.rotation[0] / 4, 5);
    });

    it('should never tilt over the pole', () => {
      const camera = new GlobeCamera(size);

      camera.rotateBy(0, -100_000);

      expect(camera.rotation[1]).toBe(85);
    });
  });

  describe('hit', () => {
    it('should find the country in the middle of the view', () => {
      const camera = new GlobeCamera(size);

      camera.lookAt(geoCentroid(outlineOf('AU').feature) as [number, number]);

      expect(camera.hit([size / 2, size / 2], outlines)?.countryCode).toBe(
        'AU',
      );
    });

    it('should find nothing outside the globe', () => {
      const camera = new GlobeCamera(size);

      expect(camera.hit([1, 1], outlines)).toBeUndefined();
    });
  });

  describe('fit', () => {
    it('should zoom a small country in further than a large one', () => {
      const camera = new GlobeCamera(size);

      expect(camera.fit(outlineOf('AT')).zoom).toBeGreaterThan(
        camera.fit(outlineOf('BR')).zoom,
      );
    });

    it('should keep a country larger than the view at the whole globe', () => {
      const camera = new GlobeCamera(size);

      expect(camera.fit(outlineOf('RU')).zoom).toBe(MIN_ZOOM);
    });

    it('should turn the country to the middle of the view', () => {
      const camera = new GlobeCamera(size);
      const [lon, lat] = geoCentroid(outlineOf('TH').feature);

      expect(camera.fit(outlineOf('TH')).rotation).toEqual([-lon, -lat]);
    });
  });

  describe('faces', () => {
    it('should face the point in the middle and not the one behind', () => {
      const camera = new GlobeCamera(size);

      camera.lookAt([0, 0]);

      expect(camera.faces([10, 10])).toBe(true);
      expect(camera.faces([180, 0])).toBe(false);
    });
  });
});
