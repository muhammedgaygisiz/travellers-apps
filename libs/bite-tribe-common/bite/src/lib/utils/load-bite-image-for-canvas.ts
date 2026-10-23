import type { Bite } from 'model';
import { biteImageSrc } from './bite-image-src';

/**
 * Loads a Bite's photo so it can be drawn into a canvas that is then exported
 * (GitHub issue #1725).
 *
 * An image fetched from Firebase Storage without CORS taints the canvas it is
 * drawn into, and `toBlob()` and `toDataURL()` then throw a `SecurityError`.
 * Requesting it with `crossOrigin = 'anonymous'` asks for the CORS headers the
 * bucket policy in `apps/bite-tribe-firebase/storage.cors.json` grants to the
 * app's own origins. The attribute is set before `src`, because the request
 * starts as soon as `src` is assigned and is not re-sent when the mode changes.
 *
 * `anonymous` sends no cookies and no credentials. None are needed: `imagePath`
 * is a tokenised download URL, readable by anyone who holds it.
 */
export const loadBiteImageForCanvas = (
  bite: Pick<Bite, 'imagePath' | 'image'>,
  createImage: () => HTMLImageElement = () => new Image(),
): Promise<HTMLImageElement> => {
  const src = biteImageSrc(bite);

  if (!src) {
    return Promise.reject(new Error('The Bite has no image to load.'));
  }

  return new Promise((resolve, reject) => {
    const image = createImage();

    image.crossOrigin = 'anonymous';
    image.onload = (): void => resolve(image);
    image.onerror = (): void =>
      reject(new Error(`The Bite image could not be loaded: ${src}`));
    image.src = src;
  });
};
