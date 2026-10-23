import { qrCode } from 'common/ui/qr-code';
import { fitText, wrapText } from './fit-text';
import {
  SHARE_IMAGE_SIZE,
  type ShareImageContent,
  type ShareImageFormat,
} from './share-image-content';
import {
  backgroundById,
  DEFAULT_SHARE_IMAGE_STYLE,
  textColourById,
  withAlpha,
  type ShareImageLayoutId,
  type ShareImageStyle,
} from './share-image-style';

/** An image the renderer can draw and measure. */
export interface DrawableImage {
  readonly width: number;
  readonly height: number;
}

export interface ShareImageAssets {
  /** The Bite's photo, loaded through `loadBiteImageForCanvas`. */
  photo?: CanvasImageSource & DrawableImage;
  /** The BiteTribe logo, drawn beside the wordmark. */
  logo?: CanvasImageSource & DrawableImage;
}

export const SHARE_IMAGE_FONT_FAMILY =
  "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** The brand name, which is drawn on every image and never switched off. */
export const WORDMARK = 'BiteTribe';

/**
 * The colours no style changes: a scanner needs a dark code on a light quiet
 * zone, and the name pill sits on the photo rather than on the background.
 */
const COLOR = {
  qrLight: '#FFFFFF',
  qrDark: '#000000',
  pill: 'rgba(0, 0, 0, 0.55)',
  pillText: '#FFFFFF',
} as const;

/** The colours of one drawing, resolved from its style. */
interface Palette {
  ground: readonly [string, string];
  panel: string;
  text: string;
  muted: string;
  star: string;
  starEmpty: string;
}

const toPalette = (style: ShareImageStyle): Palette => {
  const background = backgroundById(style.background);
  const text = textColourById(style.text).color;

  return {
    ground: background.stops,
    panel: background.panel,
    text,
    muted: withAlpha(text, 0.72),
    star: background.star,
    starEmpty: withAlpha(text, 0.24),
  };
};

/**
 * Where everything sits, per format. Each format has a layout of its own
 * rather than a scaled copy of another, because a 4:5 image is not a short
 * 9:16 one: the photo gives up height so the text and the footer keep a
 * readable size (`UC-SBS` `R-5`).
 */
export interface ShareImageLayout {
  margin: number;
  /** How far the photo sits from the top and the sides of the image. */
  photoInset: number;
  photoHeight: number;
  photoRadius: number;
  /** Space between the photo and the dish name. */
  detailsGap: number;
  dishFontSize: number;
  dishLineHeight: number;
  dishMaxLines: number;
  placeFontSize: number;
  priceFontSize: number;
  starSize: number;
  starGap: number;
  qrSize: number;
  qrRadius: number;
  logoHeight: number;
  wordmarkFontSize: number;
  /** The logo on the panel that stands in for a photo that did not load. */
  placeholderLogoHeight: number;
}

const CLASSIC: Record<ShareImageFormat, ShareImageLayout> = {
  story: {
    margin: 72,
    photoInset: 72,
    photoHeight: 1080,
    photoRadius: 48,
    detailsGap: 64,
    dishFontSize: 76,
    dishLineHeight: 90,
    dishMaxLines: 2,
    placeFontSize: 44,
    priceFontSize: 52,
    starSize: 44,
    starGap: 10,
    qrSize: 240,
    qrRadius: 24,
    logoHeight: 112,
    wordmarkFontSize: 64,
    placeholderLogoHeight: 320,
  },
  post: {
    margin: 56,
    photoInset: 56,
    photoHeight: 660,
    photoRadius: 40,
    detailsGap: 44,
    dishFontSize: 64,
    dishLineHeight: 76,
    dishMaxLines: 2,
    placeFontSize: 40,
    priceFontSize: 46,
    starSize: 38,
    starGap: 8,
    qrSize: 200,
    qrRadius: 20,
    logoHeight: 96,
    wordmarkFontSize: 56,
    placeholderLogoHeight: 240,
  },
};

/**
 * Wide runs the photo edge to edge and square at the top. The photo grows by
 * the inset it gives up, so the text below it starts exactly where Classic's
 * does and the two layouts share one overlap budget.
 */
const WIDE: Record<ShareImageFormat, ShareImageLayout> = {
  story: {
    ...CLASSIC.story,
    photoInset: 0,
    photoHeight: CLASSIC.story.photoHeight + CLASSIC.story.photoInset,
    photoRadius: 0,
  },
  post: {
    ...CLASSIC.post,
    photoInset: 0,
    photoHeight: CLASSIC.post.photoHeight + CLASSIC.post.photoInset,
    photoRadius: 0,
  },
};

/** Every layout, per format (`UC-SBS` `R-5`, `R-32`). */
export const SHARE_IMAGE_LAYOUTS: Record<
  ShareImageLayoutId,
  Record<ShareImageFormat, ShareImageLayout>
> = {
  classic: CLASSIC,
  wide: WIDE,
};

const STAR_COUNT = 5;
const PLACE_GAP_ABOVE = 8;
const PLACE_GAP_BELOW = 24;
const PRICE_GAP_ABOVE = 8;

/**
 * The lowest the text block can reach - a dish name on every line it may
 * take, a place line and a price row - so a layout can be checked against its
 * footer without drawing anything.
 */
export const detailsMaxBottom = (layout: ShareImageLayout): number =>
  layout.photoInset +
  layout.photoHeight +
  layout.detailsGap +
  layout.dishMaxLines * layout.dishLineHeight +
  PLACE_GAP_ABOVE +
  layout.placeFontSize +
  PLACE_GAP_BELOW +
  PRICE_GAP_ABOVE +
  Math.max(layout.priceFontSize, layout.starSize);

/** Where the footer - the wordmark and the QR code - begins. */
export const footerTop = (
  layout: ShareImageLayout,
  format: ShareImageFormat,
): number => SHARE_IMAGE_SIZE[format].height - layout.margin - layout.qrSize;

type Context = CanvasRenderingContext2D;

const roundedRectPath = (
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

/** Draws `image` into the box, scaled to cover it and cropped to the centre. */
const drawCover = (
  ctx: Context,
  image: CanvasImageSource & DrawableImage,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;

  ctx.drawImage(
    image,
    (image.width - sourceWidth) / 2,
    (image.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
};

/** A head and shoulders, so the sharer's name needs no word in front of it. */
const drawPersonIcon = (
  ctx: Context,
  x: number,
  y: number,
  size: number,
  color: string,
): void => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size * 0.3, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    x + size / 2,
    y + size * 0.92,
    size * 0.38,
    size * 0.3,
    0,
    Math.PI,
    Math.PI * 2,
  );
  ctx.fill();
};

/**
 * The sharer's name on a dark pill over the bottom-left of the photo. Over
 * the photo rather than in the text block, because the text block of either
 * layout has no line to spare once every field is on.
 */
const drawCreatorPill = (
  ctx: Context,
  name: string,
  width: number,
  layout: ShareImageLayout,
  fontFamily: string,
): void => {
  const fontSize = Math.round(layout.placeFontSize * 0.9);
  const height = Math.round(fontSize * 1.8);
  const padding = Math.round(height / 2.4);
  const iconSize = fontSize;
  const { photoInset } = layout;
  // In from the photo's corner, but never further out than the text margin.
  const x = Math.max(layout.margin, photoInset + 24);
  const y = photoInset + layout.photoHeight - 24 - height;
  const maxTextWidth = width - 2 * x - 2 * padding - iconSize - 12;

  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  const text = fitText(ctx, name, maxTextWidth);
  const pillWidth = 2 * padding + iconSize + 12 + ctx.measureText(text).width;

  roundedRectPath(ctx, x, y, pillWidth, height, height / 2);
  ctx.fillStyle = COLOR.pill;
  ctx.fill();
  drawPersonIcon(
    ctx,
    x + padding,
    y + (height - iconSize) / 2,
    iconSize,
    COLOR.pillText,
  );
  ctx.fillStyle = COLOR.pillText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padding + iconSize + 12, y + height / 2);
};

const drawPhoto = (
  ctx: Context,
  assets: ShareImageAssets,
  width: number,
  layout: ShareImageLayout,
  palette: Palette,
): void => {
  const { photoInset: inset, photoHeight } = layout;
  const photoWidth = width - 2 * inset;

  ctx.save();
  roundedRectPath(
    ctx,
    inset,
    inset,
    photoWidth,
    photoHeight,
    layout.photoRadius,
  );
  ctx.clip();

  if (assets.photo) {
    drawCover(ctx, assets.photo, inset, inset, photoWidth, photoHeight);
  } else {
    // A photo that could not be loaded leaves a panel with the logo on it,
    // rather than a hole in the layout.
    ctx.fillStyle = palette.panel;
    ctx.fillRect(inset, inset, photoWidth, photoHeight);

    if (assets.logo) {
      const logoHeight = layout.placeholderLogoHeight;
      const logoWidth = (assets.logo.width / assets.logo.height) * logoHeight;

      ctx.drawImage(
        assets.logo,
        inset + (photoWidth - logoWidth) / 2,
        inset + (photoHeight - logoHeight) / 2,
        logoWidth,
        logoHeight,
      );
    }
  }

  ctx.restore();
};

const starPath = (ctx: Context, x: number, y: number, size: number): void => {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const outer = size / 2;
  const inner = outer * 0.45;

  ctx.beginPath();

  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const pointX = centerX + radius * Math.cos(angle);
    const pointY = centerY + radius * Math.sin(angle);

    if (point === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }

  ctx.closePath();
};

/** Five stars, filled up to `rating`, so a half-star rating shows as one. */
const drawStars = (
  ctx: Context,
  rating: number,
  x: number,
  y: number,
  layout: ShareImageLayout,
  palette: Palette,
): void => {
  const { starSize, starGap } = layout;

  for (let star = 0; star < STAR_COUNT; star += 1) {
    const starX = x + star * (starSize + starGap);
    const filled = Math.min(Math.max(rating - star, 0), 1);

    starPath(ctx, starX, y, starSize);
    ctx.fillStyle = palette.starEmpty;
    ctx.fill();

    if (filled > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(starX, y, starSize * filled, starSize);
      ctx.clip();
      starPath(ctx, starX, y, starSize);
      ctx.fillStyle = palette.star;
      ctx.fill();
      ctx.restore();
    }
  }
};

/** Draws the text block under the photo. */
const drawDetails = (
  ctx: Context,
  content: ShareImageContent,
  width: number,
  layout: ShareImageLayout,
  palette: Palette,
  fontFamily: string,
): void => {
  const { margin } = layout;
  const maxWidth = width - 2 * margin;
  const showPhoto = content.showPhoto !== false;
  // Without the photo the text moves up to take its place.
  let y = showPhoto
    ? layout.photoInset + layout.photoHeight + layout.detailsGap
    : margin;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.text;
  ctx.font = `700 ${layout.dishFontSize}px ${fontFamily}`;

  // Text is only ever drawn with fillText: the dish name is user content, and
  // the canvas paints it as literal characters (`UC-SBS` `R-20`).
  for (const line of wrapText(
    ctx,
    content.dishName,
    maxWidth,
    layout.dishMaxLines,
  )) {
    ctx.fillText(line, margin, y);
    y += layout.dishLineHeight;
  }

  if (content.placeLine) {
    y += PLACE_GAP_ABOVE;
    ctx.fillStyle = palette.muted;
    ctx.font = `400 ${layout.placeFontSize}px ${fontFamily}`;
    ctx.fillText(fitText(ctx, content.placeLine, maxWidth), margin, y);
    y += layout.placeFontSize + PLACE_GAP_BELOW;
  }

  if (content.creatorName && !showPhoto) {
    // With no photo to carry the pill, the name is a line of its own; the
    // photo's height leaves more than enough room for it.
    const size = layout.placeFontSize;

    y += PLACE_GAP_ABOVE;
    drawPersonIcon(ctx, margin, y, size, palette.muted);
    ctx.fillStyle = palette.muted;
    ctx.font = `400 ${size}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.fillText(
      fitText(ctx, content.creatorName, maxWidth - size - 12),
      margin + size + 12,
      y,
    );
    y += size + PLACE_GAP_BELOW;
  }

  if (content.price || content.rating) {
    y += PRICE_GAP_ABOVE;
    let x = margin;

    if (content.price) {
      ctx.fillStyle = palette.text;
      ctx.font = `600 ${layout.priceFontSize}px ${fontFamily}`;
      const price = fitText(ctx, content.price, maxWidth / 2);
      ctx.fillText(price, x, y);
      x += ctx.measureText(price).width + 40;
    }

    if (content.rating) {
      drawStars(
        ctx,
        content.rating,
        x,
        y + (layout.priceFontSize - layout.starSize) / 2,
        layout,
        palette,
      );
    }
  }
};

const drawQrCode = (
  ctx: Context,
  url: string,
  x: number,
  y: number,
  size: number,
  radius: number,
): void => {
  const code = qrCode(url);
  // The viewBox is square and in module units, quiet zone included.
  const modules = Number(code.viewBox.split(' ')[2]);

  ctx.save();
  roundedRectPath(ctx, x, y, size, size, radius);
  ctx.fillStyle = COLOR.qrLight;
  ctx.fill();
  ctx.translate(x, y);
  ctx.scale(size / modules, size / modules);
  ctx.fillStyle = COLOR.qrDark;
  ctx.fill(new Path2D(code.path));
  ctx.restore();
};

const drawWordmark = (
  ctx: Context,
  assets: ShareImageAssets,
  x: number,
  centerY: number,
  layout: ShareImageLayout,
  palette: Palette,
  fontFamily: string,
): void => {
  const { logoHeight } = layout;
  let textX = x;

  if (assets.logo) {
    const logoWidth = (assets.logo.width / assets.logo.height) * logoHeight;

    ctx.drawImage(
      assets.logo,
      x,
      centerY - logoHeight / 2,
      logoWidth,
      logoHeight,
    );
    textX += logoWidth + 24;
  }

  ctx.fillStyle = palette.text;
  ctx.font = `700 ${layout.wordmarkFontSize}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(WORDMARK, textX, centerY);
};

/**
 * Draws a share image onto `ctx`, which must be a canvas of the format's
 * size, in the style's layout for that format and in its colours.
 *
 * The preview the user sees is this canvas, and the image that is shared is
 * this canvas re-encoded, so the two are the same pixels by construction
 * (`UC-SBS` `R-10`). Re-encoding is also what drops the photo's EXIF data,
 * GPS included (`R-21`).
 */
export const drawShareImage = (
  ctx: Context,
  content: ShareImageContent,
  assets: ShareImageAssets,
  format: ShareImageFormat = 'story',
  fontFamily: string = SHARE_IMAGE_FONT_FAMILY,
  style: ShareImageStyle = DEFAULT_SHARE_IMAGE_STYLE,
): void => {
  const { width, height } = SHARE_IMAGE_SIZE[format];
  const layout = SHARE_IMAGE_LAYOUTS[style.layout][format];
  const palette = toPalette(style);
  const ground = ctx.createLinearGradient(0, 0, 0, height);

  ground.addColorStop(0, palette.ground[0]);
  ground.addColorStop(1, palette.ground[1]);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);

  if (content.showPhoto !== false) {
    drawPhoto(ctx, assets, width, layout, palette);

    if (content.creatorName) {
      drawCreatorPill(ctx, content.creatorName, width, layout, fontFamily);
    }
  }

  drawDetails(ctx, content, width, layout, palette, fontFamily);

  const { margin, qrSize } = layout;
  const top = footerTop(layout, format);

  drawQrCode(
    ctx,
    content.qrUrl,
    width - margin - qrSize,
    top,
    qrSize,
    layout.qrRadius,
  );

  drawWordmark(
    ctx,
    assets,
    margin,
    top + qrSize / 2,
    layout,
    palette,
    fontFamily,
  );
};
