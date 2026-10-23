import type { Bite } from 'model';
import { sharedBiteUrl } from 'utils';

/** The image sizes a share image is composed at (`UC-SBS` `R-5`). */
/**
 * `story` is 9:16, for Instagram and Facebook Stories; `post` is 4:5,
 * Instagram's tallest feed ratio.
 */
export type ShareImageFormat = 'story' | 'post';

export const SHARE_IMAGE_SIZE: Record<
  ShareImageFormat,
  { width: number; height: number }
> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

/**
 * What a share image says, already turned into the strings that are drawn.
 *
 * It is the whole list of fields `UC-SBS` `R-6` allows, minus the creator's
 * display name, which #1728 adds behind a switch. Nothing else from the Bite
 * reaches the canvas: no coordinates, no address and no profile photo
 * (`R-9`, `R-22`).
 */
export interface ShareImageContent {
  dishName: string;
  /** The restaurant and its city, or whichever of the two the Bite has. */
  placeLine: string;
  /** The price in the Bite's own currency, or absent when it has none. */
  price?: string;
  /** Between 0 and 5, or absent when the Bite is unrated. */
  rating?: number;
  /** What the QR code encodes. */
  qrUrl: string;
}

const MAX_RATING = 5;

const formatPrice = (
  price: number,
  currency: string | undefined,
  lang: string,
): string => {
  if (currency) {
    try {
      return new Intl.NumberFormat(lang, {
        style: 'currency',
        currency,
      }).format(price);
    } catch {
      // A currency code Intl does not know is still worth showing, as the
      // link share shows it.
      return `${currency} ${price}`;
    }
  }

  return new Intl.NumberFormat(lang).format(price);
};

export const toShareImageContent = (
  bite: Bite,
  lang: string,
): ShareImageContent => ({
  dishName: bite.name,
  placeLine: [bite.place, bite.city].filter((part) => !!part).join(' · '),
  price: bite.price ? formatPrice(bite.price, bite.currency, lang) : undefined,
  rating: bite.rating
    ? Math.min(Math.max(bite.rating, 0), MAX_RATING)
    : undefined,
  qrUrl: sharedBiteUrl(bite.id),
});
