import {
  detailsMaxBottom,
  drawShareImage,
  footerTop,
  SHARE_IMAGE_LAYOUT,
  WORDMARK,
} from '../draw-share-image';
import {
  SHARE_IMAGE_SIZE,
  type ShareImageFormat,
} from '../share-image-content';
import type { ShareImageContent } from '../share-image-content';

/**
 * jsdom has no canvas, so the test records what the template asks a 2D
 * context to do. Every character measures ten pixels.
 */
const createRecordingContext = (): {
  ctx: CanvasRenderingContext2D;
  texts: string[];
  images: unknown[];
  paths: unknown[];
} => {
  const texts: string[] = [];
  const images: unknown[] = [];
  const paths: unknown[] = [];
  const ctx = new Proxy(
    {
      fillText: (text: string): void => {
        texts.push(text);
      },
      drawImage: (image: unknown): void => {
        images.push(image);
      },
      fill: (path?: unknown): void => {
        if (path) {
          paths.push(path);
        }
      },
      measureText: (text: string): TextMetrics =>
        ({ width: Array.from(text).length * 10 }) as TextMetrics,
    } as Record<string, unknown>,
    {
      get: (target, key: string): unknown =>
        target[key] ?? ((): void => undefined),
      set: (target, key: string, value): boolean => {
        target[key] = value;
        return true;
      },
    },
  );

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    texts,
    images,
    paths,
  };
};

const content: ShareImageContent = {
  dishName: 'Pad thai',
  placeLine: 'Som Tam Nua · Bangkok',
  price: 'THB 120.00',
  rating: 4,
  qrUrl: 'https://bitetribe.app/s/bite/bite-1',
};

const photo = { width: 3000, height: 4000 } as unknown as HTMLImageElement;
const logo = { width: 685, height: 885 } as unknown as HTMLImageElement;

beforeAll(() => {
  // jsdom has no Path2D either; the QR code is handed to fill() as one.
  (globalThis as { Path2D?: unknown }).Path2D = class {
    constructor(readonly d: string) {}
  };
});

describe(drawShareImage.name, () => {
  it('draws the dish, the place, the price and the wordmark as text', () => {
    const { ctx, texts } = createRecordingContext();

    drawShareImage(ctx, content, { photo, logo });

    expect(texts).toEqual([
      'Pad thai',
      'Som Tam Nua · Bangkok',
      'THB 120.00',
      WORDMARK,
    ]);
  });

  it('draws the photo and the logo', () => {
    const { ctx, images } = createRecordingContext();

    drawShareImage(ctx, content, { photo, logo });

    expect(images).toEqual([photo, logo]);
  });

  it('draws markup in a dish name as the literal characters', () => {
    const { ctx, texts } = createRecordingContext();
    const markup = '<img src=x onerror=alert(1)>';

    drawShareImage(ctx, { ...content, dishName: markup }, { photo, logo });

    expect(texts.join(' ')).toContain('<img');
    expect(texts.join(' ')).toContain('onerror=alert(1)>');
  });

  it('keeps the wordmark when there is no logo', () => {
    const { ctx, texts } = createRecordingContext();

    drawShareImage(ctx, content, {});

    expect(texts).toContain(WORDMARK);
  });

  it('leaves out the price row when the Bite has neither price nor rating', () => {
    const { ctx, texts } = createRecordingContext();

    drawShareImage(
      ctx,
      { ...content, price: undefined, rating: undefined },
      { photo, logo },
    );

    expect(texts).toEqual(['Pad thai', 'Som Tam Nua · Bangkok', WORDMARK]);
  });

  it('draws a placeholder with the logo when the photo did not load', () => {
    const { ctx, images } = createRecordingContext();

    drawShareImage(ctx, content, { logo });

    expect(images).toEqual([logo, logo]);
  });

  it('draws the same fields at 4:5', () => {
    const { ctx, texts, images } = createRecordingContext();

    drawShareImage(ctx, content, { photo, logo }, 'post');

    expect(texts).toEqual([
      'Pad thai',
      'Som Tam Nua · Bangkok',
      'THB 120.00',
      WORDMARK,
    ]);
    expect(images).toEqual([photo, logo]);
  });
});

/** Switched-off fields (UC-SBS R-6, issue #1728). */
describe('a share image with fields switched off', () => {
  it('draws neither the photo nor its panel when the photo is off', () => {
    const { ctx, images } = createRecordingContext();

    drawShareImage(ctx, { ...content, showPhoto: false }, { photo, logo });

    // Only the logo beside the wordmark is left.
    expect(images).toEqual([logo]);
  });

  it('draws no QR code when it is off', () => {
    const { ctx, paths } = createRecordingContext();

    drawShareImage(ctx, { ...content, qrUrl: undefined }, { photo, logo });

    expect(paths).toEqual([]);
  });

  it('draws a QR code when it is on', () => {
    const { ctx, paths } = createRecordingContext();

    drawShareImage(ctx, content, { photo, logo });

    expect(paths).toHaveLength(1);
  });

  it('keeps the wordmark with every field off', () => {
    const { ctx, texts } = createRecordingContext();

    drawShareImage(
      ctx,
      { showPhoto: false, dishName: '', placeLine: '' },
      { photo, logo },
    );

    expect(texts).toEqual([WORDMARK]);
  });

  it('draws the sharer’s name over the photo', () => {
    const { ctx, texts } = createRecordingContext();

    drawShareImage(
      ctx,
      { ...content, creatorName: 'Super Mario' },
      {
        photo,
        logo,
      },
    );

    expect(texts).toEqual([
      'Super Mario',
      'Pad thai',
      'Som Tam Nua · Bangkok',
      'THB 120.00',
      WORDMARK,
    ]);
  });

  it('draws the sharer’s name as a line when the photo is off', () => {
    const { ctx, texts } = createRecordingContext();

    drawShareImage(
      ctx,
      { ...content, showPhoto: false, creatorName: 'Super Mario' },
      { photo, logo },
    );

    expect(texts).toEqual([
      'Pad thai',
      'Som Tam Nua · Bangkok',
      'Super Mario',
      'THB 120.00',
      WORDMARK,
    ]);
  });
});

/** UC-SBS R-5: each format lays the template out within its own size. */
describe.each<ShareImageFormat>(['story', 'post'])(
  'the %s layout',
  (format) => {
    const layout = SHARE_IMAGE_LAYOUT[format];
    const { width, height } = SHARE_IMAGE_SIZE[format];

    it('ends the longest possible text block above the footer', () => {
      expect(detailsMaxBottom(layout)).toBeLessThan(footerTop(layout, format));
    });

    it('keeps the footer inside the image', () => {
      expect(footerTop(layout, format) + layout.qrSize).toBeLessThanOrEqual(
        height - layout.margin,
      );
    });

    it('leaves room beside the QR code for the wordmark', () => {
      const wordmarkRoom = width - 2 * layout.margin - layout.qrSize;

      // The logo plus "BiteTribe" in a bold face is about five font-sizes wide.
      expect(layout.logoHeight + 5 * layout.wordmarkFontSize).toBeLessThan(
        wordmarkRoom,
      );
    });
  },
);
