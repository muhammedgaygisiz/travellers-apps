import { qrCode } from 'common/ui/qr-code';
import { fitText, wrapText } from './fit-text';
import {
  SHARE_IMAGE_SIZE,
  type ShareImageContent,
  type ShareImageFormat,
} from './share-image-content';

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

const COLOR = {
  ground: '#1A1C22',
  panel: '#262A33',
  text: '#FFFFFF',
  muted: 'rgba(255, 255, 255, 0.72)',
  star: '#F8B850',
  starEmpty: 'rgba(255, 255, 255, 0.24)',
  qrLight: '#FFFFFF',
  qrDark: '#000000',
} as const;

const MARGIN = 72;
const PHOTO_HEIGHT = 1080;
const PHOTO_RADIUS = 48;
const DISH_FONT_SIZE = 76;
const DISH_LINE_HEIGHT = 90;
const DISH_MAX_LINES = 2;
const PLACE_FONT_SIZE = 44;
const PRICE_FONT_SIZE = 52;
const STAR_SIZE = 44;
const STAR_GAP = 10;
const STAR_COUNT = 5;
const QR_SIZE = 240;
const QR_RADIUS = 24;
const LOGO_HEIGHT = 112;
const WORDMARK_FONT_SIZE = 64;

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

const drawPhoto = (
  ctx: Context,
  assets: ShareImageAssets,
  width: number,
): void => {
  const photoWidth = width - 2 * MARGIN;

  ctx.save();
  roundedRectPath(ctx, MARGIN, MARGIN, photoWidth, PHOTO_HEIGHT, PHOTO_RADIUS);
  ctx.clip();

  if (assets.photo) {
    drawCover(ctx, assets.photo, MARGIN, MARGIN, photoWidth, PHOTO_HEIGHT);
  } else {
    // A photo that could not be loaded leaves a panel with the logo on it,
    // rather than a hole in the layout.
    ctx.fillStyle = COLOR.panel;
    ctx.fillRect(MARGIN, MARGIN, photoWidth, PHOTO_HEIGHT);

    if (assets.logo) {
      const logoHeight = 320;
      const logoWidth = (assets.logo.width / assets.logo.height) * logoHeight;

      ctx.drawImage(
        assets.logo,
        MARGIN + (photoWidth - logoWidth) / 2,
        MARGIN + (PHOTO_HEIGHT - logoHeight) / 2,
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
): void => {
  for (let star = 0; star < STAR_COUNT; star += 1) {
    const starX = x + star * (STAR_SIZE + STAR_GAP);
    const filled = Math.min(Math.max(rating - star, 0), 1);

    starPath(ctx, starX, y, STAR_SIZE);
    ctx.fillStyle = COLOR.starEmpty;
    ctx.fill();

    if (filled > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(starX, y, STAR_SIZE * filled, STAR_SIZE);
      ctx.clip();
      starPath(ctx, starX, y, STAR_SIZE);
      ctx.fillStyle = COLOR.star;
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
  fontFamily: string,
): void => {
  const maxWidth = width - 2 * MARGIN;
  let y = MARGIN + PHOTO_HEIGHT + 64;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLOR.text;
  ctx.font = `700 ${DISH_FONT_SIZE}px ${fontFamily}`;

  // Text is only ever drawn with fillText: the dish name is user content, and
  // the canvas paints it as literal characters (`UC-SBS` `R-20`).
  for (const line of wrapText(
    ctx,
    content.dishName,
    maxWidth,
    DISH_MAX_LINES,
  )) {
    ctx.fillText(line, MARGIN, y);
    y += DISH_LINE_HEIGHT;
  }

  if (content.placeLine) {
    y += 8;
    ctx.fillStyle = COLOR.muted;
    ctx.font = `400 ${PLACE_FONT_SIZE}px ${fontFamily}`;
    ctx.fillText(fitText(ctx, content.placeLine, maxWidth), MARGIN, y);
    y += PLACE_FONT_SIZE + 24;
  }

  if (content.price || content.rating) {
    y += 8;
    let x = MARGIN;

    if (content.price) {
      ctx.fillStyle = COLOR.text;
      ctx.font = `600 ${PRICE_FONT_SIZE}px ${fontFamily}`;
      const price = fitText(ctx, content.price, maxWidth / 2);
      ctx.fillText(price, x, y);
      x += ctx.measureText(price).width + 40;
    }

    if (content.rating) {
      drawStars(ctx, content.rating, x, y + (PRICE_FONT_SIZE - STAR_SIZE) / 2);
    }
  }
};

const drawQrCode = (
  ctx: Context,
  url: string,
  x: number,
  y: number,
  size: number,
): void => {
  const code = qrCode(url);
  // The viewBox is square and in module units, quiet zone included.
  const modules = Number(code.viewBox.split(' ')[2]);

  ctx.save();
  roundedRectPath(ctx, x, y, size, size, QR_RADIUS);
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
  fontFamily: string,
): void => {
  let textX = x;

  if (assets.logo) {
    const logoWidth = (assets.logo.width / assets.logo.height) * LOGO_HEIGHT;

    ctx.drawImage(
      assets.logo,
      x,
      centerY - LOGO_HEIGHT / 2,
      logoWidth,
      LOGO_HEIGHT,
    );
    textX += logoWidth + 24;
  }

  ctx.fillStyle = COLOR.text;
  ctx.font = `700 ${WORDMARK_FONT_SIZE}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(WORDMARK, textX, centerY);
};

/**
 * Draws the first share-image template onto `ctx`, which must be a canvas of
 * the format's size.
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
): void => {
  const { width, height } = SHARE_IMAGE_SIZE[format];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLOR.ground;
  ctx.fillRect(0, 0, width, height);

  drawPhoto(ctx, assets, width);
  drawDetails(ctx, content, width, fontFamily);

  const footerTop = height - MARGIN - QR_SIZE;

  drawQrCode(ctx, content.qrUrl, width - MARGIN - QR_SIZE, footerTop, QR_SIZE);
  drawWordmark(ctx, assets, MARGIN, footerTop + QR_SIZE / 2, fontFamily);
};
