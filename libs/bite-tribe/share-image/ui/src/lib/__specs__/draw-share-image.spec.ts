import { drawShareImage, WORDMARK } from '../draw-share-image';
import type { ShareImageContent } from '../share-image-content';

/**
 * jsdom has no canvas, so the test records what the template asks a 2D
 * context to do. Every character measures ten pixels.
 */
const createRecordingContext = (): {
  ctx: CanvasRenderingContext2D;
  texts: string[];
  images: unknown[];
} => {
  const texts: string[] = [];
  const images: unknown[] = [];
  const ctx = new Proxy(
    {
      fillText: (text: string): void => {
        texts.push(text);
      },
      drawImage: (image: unknown): void => {
        images.push(image);
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

  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, images };
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
});
