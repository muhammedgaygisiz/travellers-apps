import { FloorPlanSize } from 'model';
import {
  FIT_MARGIN_RATIO,
  MAX_ZOOM,
  MIN_ZOOM,
  SCALE_BAR_LENGTHS,
  clampCentre,
  clampZoom,
  fitViewportSize,
  millimetresPerPixel,
  roomCentre,
  scaleBarLength,
  viewportFor,
  viewportPointAt,
} from '../floor-plan-viewport';

/** The room the acceptance criteria of issue #1082 are written about. */
const EIGHT_BY_TWELVE: FloorPlanSize = { width: 8000, height: 12_000 };

describe('floor plan viewport', () => {
  describe(fitViewportSize.name, () => {
    it('keeps the room proportional, so the plan is never stretched', () => {
      const fit = fitViewportSize(EIGHT_BY_TWELVE);
      const margin = 12_000 * FIT_MARGIN_RATIO;

      expect(fit).toEqual({
        width: 8000 + 2 * margin,
        height: 12_000 + 2 * margin,
      });
    });

    it('uses the same margin on all four sides of a long narrow room', () => {
      const room: FloorPlanSize = { width: 2000, height: 30_000 };
      const fit = fitViewportSize(room);

      expect(fit.width - room.width).toBeCloseTo(fit.height - room.height);
    });
  });

  describe(viewportFor.name, () => {
    it('centres the room and shows all of it at zoom 1', () => {
      const viewport = viewportFor(
        EIGHT_BY_TWELVE,
        roomCentre(EIGHT_BY_TWELVE),
        1,
      );

      expect(viewport.x).toBeLessThan(0);
      expect(viewport.y).toBeLessThan(0);
      expect(viewport.x + viewport.width).toBeGreaterThan(
        EIGHT_BY_TWELVE.width,
      );
      expect(viewport.y + viewport.height).toBeGreaterThan(
        EIGHT_BY_TWELVE.height,
      );
    });

    it('keeps the aspect ratio of the room at every zoom level', () => {
      const fit = fitViewportSize(EIGHT_BY_TWELVE);
      const ratio = fit.width / fit.height;

      [MIN_ZOOM, 1, 3, MAX_ZOOM].forEach((zoom) => {
        const viewport = viewportFor(
          EIGHT_BY_TWELVE,
          roomCentre(EIGHT_BY_TWELVE),
          zoom,
        );

        expect(viewport.width / viewport.height).toBeCloseTo(ratio);
      });
    });

    it('shows half as much when zoomed in twice as far', () => {
      const centre = roomCentre(EIGHT_BY_TWELVE);
      const fit = viewportFor(EIGHT_BY_TWELVE, centre, 1);
      const closer = viewportFor(EIGHT_BY_TWELVE, centre, 2);

      expect(closer.width).toBeCloseTo(fit.width / 2);
      expect(closer.height).toBeCloseTo(fit.height / 2);
    });
  });

  describe(clampZoom.name, () => {
    it('refuses to zoom past the bounds the canvas stays readable in', () => {
      expect(clampZoom(0.01)).toBe(MIN_ZOOM);
      expect(clampZoom(1000)).toBe(MAX_ZOOM);
      expect(clampZoom(3)).toBe(3);
    });
  });

  describe(clampCentre.name, () => {
    it('keeps the viewport centre on the floor', () => {
      expect(clampCentre({ x: -5000, y: 40_000 }, EIGHT_BY_TWELVE)).toEqual({
        x: 0,
        y: 12_000,
      });
    });

    it('leaves a centre inside the room untouched', () => {
      expect(clampCentre({ x: 1000, y: 2000 }, EIGHT_BY_TWELVE)).toEqual({
        x: 1000,
        y: 2000,
      });
    });
  });

  describe(scaleBarLength.name, () => {
    it('is always a round distance a reader can measure with', () => {
      [500, 2400, 14_000, 90_000].forEach((width) => {
        expect(SCALE_BAR_LENGTHS).toContain(scaleBarLength(width));
      });
    });

    it('picks the longest rung that fits in a fifth of the viewport', () => {
      expect(scaleBarLength(10_000)).toBe(2000);
      expect(scaleBarLength(6000)).toBe(1000);
    });

    it('still reports a reference on a viewport smaller than the shortest rung', () => {
      expect(scaleBarLength(100)).toBe(SCALE_BAR_LENGTHS[0]);
    });
  });

  describe(millimetresPerPixel.name, () => {
    it('reports the scale of whichever axis runs out first', () => {
      const viewport = { x: 0, y: 0, width: 10_000, height: 5000 };

      // 500px wide, 500px tall: the width is the limit at 20 mm per pixel.
      expect(millimetresPerPixel(viewport, { width: 500, height: 500 })).toBe(
        20,
      );
    });

    it('reports nothing for an element that has not been laid out', () => {
      const viewport = { x: 0, y: 0, width: 10_000, height: 5000 };

      expect(
        millimetresPerPixel(viewport, { width: 0, height: 0 }),
      ).toBeUndefined();
    });

    it('reports nothing for a viewport with no area', () => {
      expect(
        millimetresPerPixel(
          { x: 0, y: 0, width: 0, height: 0 },
          { width: 500, height: 500 },
        ),
      ).toBeUndefined();
    });
  });

  describe(viewportPointAt.name, () => {
    const viewport = { x: 0, y: 0, width: 10_000, height: 5000 };
    const element = { left: 20, top: 10, width: 500, height: 250 };

    it('reads a pointer position as a point in the room', () => {
      expect(
        viewportPointAt(viewport, element, { clientX: 270, clientY: 135 }),
      ).toEqual({ x: 5000, y: 2500 });
    });

    /**
     * A gesture the caller should ignore rather than place at the origin.
     *
     * An element with no size has no scale to measure a pointer against, and
     * it is a state the canvas genuinely passes through: a pointer event can
     * arrive on the frame the plan is first laid out in.
     */
    it('reports nothing before the canvas has been laid out', () => {
      expect(
        viewportPointAt(
          viewport,
          { left: 0, top: 0, width: 0, height: 0 },
          { clientX: 270, clientY: 135 },
        ),
      ).toBeUndefined();
    });
  });
});
