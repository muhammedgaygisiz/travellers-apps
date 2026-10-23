import type { Bite } from 'model';
import { sharedBiteUrl } from 'utils';

/**
 * The image sizes a share image is composed at (`UC-SBS` `R-5`): `story` is
 * 9:16, for Instagram and Facebook Stories; `post` is 4:5, Instagram's tallest
 * feed ratio.
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
 * It is the whole list of fields `UC-SBS` `R-6` allows. Nothing else from the
 * Bite reaches the canvas: no coordinates, no address and no profile photo
 * (`R-9`, `R-22`). A field that is empty or absent is not drawn, and the
 * layout closes up behind it.
 */
export interface ShareImageContent {
  /** Whether the photo, or the panel standing in for it, is drawn at all. */
  showPhoto?: boolean;
  dishName: string;
  /** The restaurant and its city, or whichever of the two the Bite has. */
  placeLine: string;
  /** The price in the Bite's own currency, or absent when it has none. */
  price?: string;
  /** Between 0 and 5, or absent when the Bite is unrated. */
  rating?: number;
  /**
   * What the QR code encodes. The code is on every image, like the wordmark:
   * it is how a viewer of the post finds the Bite in BiteTribe.
   */
  qrUrl: string;
  /**
   * The sharer's BiteTribe display name, present only when they switched it
   * on and only while their profile is public (`R-8`).
   */
  creatorName?: string;
}

/**
 * The fields a share image has a switch for. The wordmark and the QR code
 * have none: they are on every image (`R-6`, `R-7`).
 */
export const SHARE_IMAGE_FIELDS = [
  'photo',
  'dishName',
  'place',
  'price',
  'rating',
  'creatorName',
] as const;

export type ShareImageField = (typeof SHARE_IMAGE_FIELDS)[number];

export type ShareImageFieldSwitches = Record<ShareImageField, boolean>;

/**
 * Every field on, except the sharer's own name: their account already
 * identifies them, so naming themselves is a choice they make (`R-8`).
 */
export const DEFAULT_FIELD_SWITCHES: ShareImageFieldSwitches = {
  photo: true,
  dishName: true,
  place: true,
  price: true,
  rating: true,
  creatorName: false,
};

/**
 * The fields worth a switch for this content. A field the Bite has no value
 * for gets none - a switch that changes nothing would only confuse.
 */
export const availableFields = (
  content: ShareImageContent,
): ShareImageField[] =>
  SHARE_IMAGE_FIELDS.filter((field) => {
    switch (field) {
      case 'dishName':
        return !!content.dishName;
      case 'place':
        return !!content.placeLine;
      case 'price':
        return !!content.price;
      case 'rating':
        return !!content.rating;
      case 'creatorName':
        return !!content.creatorName;
      default:
        return true;
    }
  });

/** The content with every switched-off field removed. */
export const applyFieldSwitches = (
  content: ShareImageContent,
  switches: ShareImageFieldSwitches,
): ShareImageContent => ({
  showPhoto: switches.photo,
  dishName: switches.dishName ? content.dishName : '',
  placeLine: switches.place ? content.placeLine : '',
  price: switches.price ? content.price : undefined,
  rating: switches.rating ? content.rating : undefined,
  qrUrl: content.qrUrl,
  creatorName: switches.creatorName ? content.creatorName : undefined,
});

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

/**
 * The content of a Bite's share image. `creatorName` is the sharer's display
 * name, which the caller passes only while their profile is public.
 */
export const toShareImageContent = (
  bite: Bite,
  lang: string,
  creatorName?: string,
): ShareImageContent => ({
  dishName: bite.name,
  placeLine: [bite.place, bite.city].filter((part) => !!part).join(' · '),
  price: bite.price ? formatPrice(bite.price, bite.currency, lang) : undefined,
  rating: bite.rating
    ? Math.min(Math.max(bite.rating, 0), MAX_RATING)
    : undefined,
  qrUrl: sharedBiteUrl(bite.id),
  creatorName: creatorName || undefined,
});
