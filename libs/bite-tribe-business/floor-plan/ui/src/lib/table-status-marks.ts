import { TABLE_STATUSES, TableStatus } from 'model';

/**
 * How a live table status is drawn on the plan (GitHub issue #1093).
 *
 * ## Three channels, and which one actually carries the meaning
 *
 * A status is drawn as a colour, a glyph and a word, together. The acceptance
 * criterion is that staff can tell the statuses apart in greyscale and with a
 * colour-vision deficiency, and only two of the three survive that: the word
 * always does, and the glyph does because the glyphs differ in *silhouette* and
 * in filled-against-hollow rather than only in hue. The colour is the channel
 * that makes a room readable at a glance across it, and it is the one that is
 * allowed to fail - so nothing here depends on it alone.
 *
 * That is also why the glyphs are not pictograms. A broom for `cleaning` and a
 * banknote for `awaitingPayment` are legible at toolbar size and are a grey
 * smudge at the size a 900 mm round table gives them at zoom-to-fit. Four
 * silhouettes crossed with filled and hollow give seven marks that stay
 * themselves at any size a plan is read at, and the word beside them says which
 * is which.
 *
 * ## Where the copy is
 *
 * The mark names its Transloco key rather than its English, because the canvas
 * that draws it is a `type:ui` library and the same status is named in the
 * summary bar and in the table detail beside the plan. One key per status, in
 * one place, so the plan and the panel beside it cannot disagree about what a
 * table is doing.
 */

/**
 * The shape of one status mark.
 *
 * Deliberately a small closed vocabulary rather than arbitrary path data: the
 * marks have to be told apart from each other, and four silhouettes that are
 * each either filled or hollow is a set a reader can hold, where eleven
 * bespoke drawings is not.
 */
export type TableStatusGlyph = 'circle' | 'diamond' | 'square' | 'cross';

/** Everything the canvas needs to draw one status. */
export interface TableStatusMark {
  status: TableStatus;
  /** The silhouette. */
  glyph: TableStatusGlyph;
  /**
   * Whether the silhouette is painted or outlined.
   *
   * The distinction the rest of this drawing already uses for a wall against a
   * table, and the one that survives a photocopy. Broadly: a table with nobody
   * at it is hollow and a table with a party at it is filled.
   */
  filled: boolean;
  /**
   * The hue, as a hex colour used at full strength for the outline and at
   * {@link STATUS_TINT_ALPHA} for the fill.
   *
   * One colour for both themes rather than a light and a dark variant. Each
   * sits in the middle of the lightness range, so it holds its contrast against
   * a white page and against the app's near-black, and the tint that washes
   * over the table is the same hue moving the table towards the status in
   * whichever direction the background lies.
   */
  colour: string;
  /** The Transloco key naming the status to staff. */
  labelKey: string;
}

/**
 * How much of the status colour a table's fill takes.
 *
 * Low enough that the table's number stays the most legible thing on it - the
 * number is what staff call out, and a status that shouted over it would have
 * made the plan harder to use during service, not easier. High enough that a
 * room reads as a pattern of colours from across it, which is the whole reason
 * the channel is there.
 */
export const STATUS_TINT_ALPHA = 0.22;

const MARKS: Readonly<Record<TableStatus, TableStatusMark>> = {
  available: {
    status: 'available',
    glyph: 'circle',
    filled: false,
    colour: '#2e9e5b',
    labelKey: 'table-status-available',
  },
  reserved: {
    status: 'reserved',
    glyph: 'diamond',
    filled: false,
    colour: '#b8891a',
    labelKey: 'table-status-reserved',
  },
  occupied: {
    status: 'occupied',
    glyph: 'circle',
    filled: true,
    colour: '#3b7dd8',
    labelKey: 'table-status-occupied',
  },
  ordering: {
    status: 'ordering',
    glyph: 'square',
    filled: true,
    colour: '#8a5bd6',
    labelKey: 'table-status-ordering',
  },
  awaitingPayment: {
    status: 'awaitingPayment',
    glyph: 'diamond',
    filled: true,
    colour: '#d9702a',
    labelKey: 'table-status-awaiting-payment',
  },
  cleaning: {
    status: 'cleaning',
    glyph: 'square',
    filled: false,
    colour: '#1f9aa8',
    labelKey: 'table-status-cleaning',
  },
  disabled: {
    status: 'disabled',
    glyph: 'cross',
    filled: false,
    colour: '#7c828d',
    labelKey: 'table-status-disabled',
  },
};

/** How one status is drawn. */
export const tableStatusMark = (status: TableStatus): TableStatusMark =>
  MARKS[status];

/** Every mark, in the order the lifecycle visits the statuses. */
export const TABLE_STATUS_MARKS: readonly TableStatusMark[] =
  TABLE_STATUSES.map(tableStatusMark);

/**
 * A colour at an opacity, as a value SVG can take.
 *
 * `rgba()` from a hex rather than `fill-opacity`, because the table underneath
 * is already painted and a second opacity on the same element would have meant
 * choosing between tinting the outline too or splitting the shape in two.
 */
export const withAlpha = (colour: string, alpha: number): string => {
  const hex = colour.replace('#', '');
  const channel = (at: number): number =>
    parseInt(hex.slice(at, at + 2), 16) || 0;

  return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${alpha})`;
};

/**
 * The path for one glyph, centred on a point and drawn inside a box of `size`.
 *
 * Every glyph is a path, including the circle, so the canvas draws one element
 * per mark instead of branching on the shape in the template. `size` is the
 * full width of the box, so the shapes share a bounding box and a row of them
 * lines up.
 */
export const tableStatusGlyphPath = (
  glyph: TableStatusGlyph,
  cx: number,
  cy: number,
  size: number,
): string => {
  const r = size / 2;

  switch (glyph) {
    case 'circle':
      // Two half-arcs, because a full circle as a single arc has no end point
      // distinct from its start and renders as nothing.
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    case 'diamond':
      return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
    case 'square':
      return `M ${cx - r} ${cy - r} L ${cx + r} ${cy - r} L ${cx + r} ${cy + r} L ${cx - r} ${cy + r} Z`;
    default:
      return `M ${cx - r} ${cy - r} L ${cx + r} ${cy + r} M ${cx + r} ${cy - r} L ${cx - r} ${cy + r}`;
  }
};
