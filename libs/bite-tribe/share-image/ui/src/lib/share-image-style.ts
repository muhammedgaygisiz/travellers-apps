/**
 * How a share image looks, as data the one shared renderer reads (#1731).
 *
 * The layout and the colours are chosen separately: any layout with any
 * background, and any text colour that is legible on that background. Adding
 * a layout, a background or a text colour changes only the lists below - no
 * composer code and no renderer code.
 */

/** Classic frames the photo in the card; Bold runs it edge to edge. */
export const SHARE_IMAGE_LAYOUT_IDS = ['classic', 'bold'] as const;

export type ShareImageLayoutId = (typeof SHARE_IMAGE_LAYOUT_IDS)[number];

export interface ShareImageBackground {
  id: string;
  /** Top and bottom of a vertical gradient. Equal stops give a flat ground. */
  stops: readonly [string, string];
  /** The panel that stands in for a photo that did not load. */
  panel: string;
  /** The filled part of the rating stars. */
  star: string;
}

export interface ShareImageTextColour {
  id: string;
  color: string;
}

export const SHARE_IMAGE_BACKGROUNDS = [
  // Night is the ground of #1726's card, kept flat, so it draws exactly what
  // the first template drew.
  {
    id: 'night',
    stops: ['#1A1C22', '#1A1C22'],
    panel: '#262A33',
    star: '#F8B850',
  },
  {
    id: 'dusk',
    stops: ['#2B1E3F', '#6B2A55'],
    panel: '#3A2A4F',
    star: '#F8B850',
  },
  {
    id: 'ocean',
    stops: ['#0F2C4A', '#1B5468'],
    panel: '#1E3E5A',
    star: '#F8B850',
  },
  {
    id: 'sunset',
    stops: ['#FFD8A8', '#F9AE86'],
    panel: '#F3C79C',
    star: '#B4410F',
  },
  {
    id: 'paper',
    stops: ['#FBF6EC', '#EADFC8'],
    panel: '#E8DCC4',
    star: '#B4410F',
  },
] as const satisfies readonly ShareImageBackground[];

export type ShareImageBackgroundId =
  (typeof SHARE_IMAGE_BACKGROUNDS)[number]['id'];

export const SHARE_IMAGE_TEXT_COLOURS = [
  { id: 'white', color: '#FFFFFF' },
  { id: 'cream', color: '#FFF1D6' },
  { id: 'honey', color: '#F8B850' },
  { id: 'ink', color: '#1A1C22' },
  { id: 'cocoa', color: '#55422A' },
] as const satisfies readonly ShareImageTextColour[];

export type ShareImageTextColourId =
  (typeof SHARE_IMAGE_TEXT_COLOURS)[number]['id'];

export interface ShareImageStyle {
  layout: ShareImageLayoutId;
  background: ShareImageBackgroundId;
  text: ShareImageTextColourId;
}

/** #1726's card: Classic, on Night, in white. */
export const DEFAULT_SHARE_IMAGE_STYLE: ShareImageStyle = {
  layout: 'classic',
  background: 'night',
  text: 'white',
};

/** The contrast a text colour must reach on every part of its background. */
export const MIN_TEXT_CONTRAST = 4.5;

const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

/** The WCAG 2 contrast ratio of two `#RRGGBB` colours, from 1 to 21. */
export const contrastRatio = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );

  return (lighter + 0.05) / (darker + 0.05);
};

export const backgroundById = (
  id: ShareImageBackgroundId,
): ShareImageBackground =>
  SHARE_IMAGE_BACKGROUNDS.find((background) => background.id === id) ??
  SHARE_IMAGE_BACKGROUNDS[0];

export const textColourById = (
  id: ShareImageTextColourId,
): ShareImageTextColour =>
  SHARE_IMAGE_TEXT_COLOURS.find((colour) => colour.id === id) ??
  SHARE_IMAGE_TEXT_COLOURS[0];

/**
 * The text colours legible on a background: at least `MIN_TEXT_CONTRAST`
 * against both ends of its gradient, so the wordmark and the text read
 * wherever they land.
 */
export const legibleTextColours = (
  backgroundId: ShareImageBackgroundId,
): ShareImageTextColourId[] => {
  const { stops } = backgroundById(backgroundId);

  return SHARE_IMAGE_TEXT_COLOURS.filter((colour) =>
    stops.every(
      (stop) => contrastRatio(colour.color, stop) >= MIN_TEXT_CONTRAST,
    ),
  ).map((colour) => colour.id);
};

/**
 * The style with its text colour kept if it is legible on the background, or
 * replaced by the first one that is.
 */
export const withLegibleText = (style: ShareImageStyle): ShareImageStyle => {
  const legible = legibleTextColours(style.background);

  return legible.includes(style.text)
    ? style
    : { ...style, text: legible[0] ?? DEFAULT_SHARE_IMAGE_STYLE.text };
};

/** `#RRGGBB` at an opacity, for the muted and empty-star tones of a text colour. */
export const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = [1, 3, 5].map((start) =>
    parseInt(hex.slice(start, start + 2), 16),
  );

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
