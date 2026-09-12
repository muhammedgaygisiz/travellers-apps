import { TABLE_STATUSES, TableStatus } from 'model';
import {
  STATUS_TINT_ALPHA,
  TABLE_STATUS_MARKS,
  tableStatusGlyphPath,
  tableStatusMark,
  withAlpha,
} from '../table-status-marks';

describe('table status marks', () => {
  it('has a mark for every status the model knows', () => {
    expect(TABLE_STATUS_MARKS.map((mark) => mark.status)).toEqual([
      ...TABLE_STATUSES,
    ]);
  });

  /**
   * The acceptance criterion of issue #1093: a status is distinguishable in
   * greyscale and for common colour-vision deficiencies.
   *
   * Colour is the channel that fails both, so what this asserts is the two that
   * do not. Every status has a word of its own, and every status has a mark of
   * its own - where a mark is a silhouette *and* whether it is filled, because
   * hollow against filled is exactly the distinction that survives a
   * photocopy.
   */
  it('tells every status apart without using colour', () => {
    const shapes = TABLE_STATUS_MARKS.map(
      (mark) => `${mark.glyph}:${mark.filled}`,
    );
    const words = TABLE_STATUS_MARKS.map((mark) => mark.labelKey);

    expect(new Set(shapes).size).toBe(TABLE_STATUSES.length);
    expect(new Set(words).size).toBe(TABLE_STATUSES.length);
  });

  /** And the colour is still a channel of its own, not a repeat of another. */
  it('gives every status its own colour', () => {
    const colours = TABLE_STATUS_MARKS.map((mark) => mark.colour);

    expect(new Set(colours).size).toBe(TABLE_STATUSES.length);
    colours.forEach((colour) => expect(colour).toMatch(/^#[0-9a-f]{6}$/));
  });

  it('answers for one status', () => {
    expect(tableStatusMark('occupied').labelKey).toBe('table-status-occupied');
  });

  describe('withAlpha', () => {
    it('turns a hex colour into a translucent one', () => {
      expect(withAlpha('#3b7dd8', 0.5)).toBe('rgba(59, 125, 216, 0.5)');
    });

    it('is the tint every table under service is washed with', () => {
      expect(withAlpha('#000000', STATUS_TINT_ALPHA)).toBe(
        `rgba(0, 0, 0, ${STATUS_TINT_ALPHA})`,
      );
    });
  });

  describe('glyph paths', () => {
    /**
     * A circle drawn as a single arc has no end point distinct from its start
     * and renders as nothing, so it is two half-arcs - which is the one thing
     * about these paths that is easy to get wrong and invisible when it is.
     */
    it('draws a circle as two arcs', () => {
      const path = tableStatusGlyphPath('circle', 10, 10, 4);

      expect(path.match(/A /g)).toHaveLength(2);
      expect(path.endsWith('Z')).toBe(true);
    });

    it('closes the polygons and leaves the cross open', () => {
      expect(tableStatusGlyphPath('diamond', 0, 0, 2).endsWith('Z')).toBe(true);
      expect(tableStatusGlyphPath('square', 0, 0, 2).endsWith('Z')).toBe(true);
      expect(tableStatusGlyphPath('cross', 0, 0, 2)).not.toContain('Z');
    });

    it('draws inside the box it is given', () => {
      const path = tableStatusGlyphPath('square', 100, 50, 10);

      expect(path).toBe('M 95 45 L 105 45 L 105 55 L 95 55 Z');
    });

    /** Every mark can be drawn, whatever silhouette it turns out to carry. */
    it('has a path for every status', () => {
      (TABLE_STATUSES as readonly TableStatus[]).forEach((status) => {
        expect(
          tableStatusGlyphPath(tableStatusMark(status).glyph, 0, 0, 10),
        ).not.toBe('');
      });
    });
  });
});
