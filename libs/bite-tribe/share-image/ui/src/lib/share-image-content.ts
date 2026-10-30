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
  /**
   * The line naming the first this Bite was, such as "My first Bite in
   * Japan", present only on a celebrated Bite (issue #1837).
   */
  celebration?: string;
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
  'celebration',
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
  // Whoever opens the composer on a celebrated Bite most likely shares it
  // because of that, so the line starts on.
  celebration: true,
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
      case 'celebration':
        return !!content.celebration;
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
  celebration: switches.celebration ? content.celebration : undefined,
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
 * name, which the caller passes only while their profile is public, and
 * `celebration` the already translated line for a celebrated Bite.
 */
export const toShareImageContent = (
  bite: Bite,
  lang: string,
  creatorName?: string,
  celebration?: string,
): ShareImageContent => ({
  dishName: bite.name,
  placeLine: [bite.place, bite.city].filter((part) => !!part).join(' · '),
  price: bite.price ? formatPrice(bite.price, bite.currency, lang) : undefined,
  rating: bite.rating
    ? Math.min(Math.max(bite.rating, 0), MAX_RATING)
    : undefined,
  qrUrl: sharedBiteUrl(bite.id),
  creatorName: creatorName || undefined,
  celebration: celebration || undefined,
});

/**
 * A first the app celebrated that belongs to one Bite (issue #1837). The other
 * celebrated moments - finishing onboarding, a first follow, a completed
 * BiteTrail - are not about a Bite, so no share image names them.
 */
export type ShareImageCelebration =
  { moment: 'first-bite' } | { moment: 'first-country'; countryCode: string };

/** When a Bite was posted, or `undefined` where it does not say. */
const postedAt = (bite: Bite): number | undefined => {
  if (typeof bite.createdAtTimestamp === 'number') {
    return bite.createdAtTimestamp;
  }

  const parsed = bite.createdAt ? Date.parse(bite.createdAt) : NaN;

  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Which first `bite` was, worked out from the sharer's own Bites rather than
 * remembered from the celebration, so it is right days later and after a
 * session that missed the celebration (#1835).
 *
 * It follows the celebration's own rule: the earliest Bite is the first Bite,
 * and the earliest Bite in a country is a first country only when an earlier
 * Bite already had a country - going from no country to one is the first
 * Bite, not a first country. Nothing is claimed where the answer cannot be
 * told: when `ownBites` leaves out `bite` itself, and so is not the whole list,
 * or when any of them does not say when it was posted.
 */
export const celebrationOf = (
  bite: Bite,
  ownBites: readonly Bite[],
): ShareImageCelebration | undefined => {
  const at = postedAt(bite);
  const others = ownBites.filter((other) => other.id !== bite.id);

  if (
    at === undefined ||
    others.length === ownBites.length ||
    others.some((other) => postedAt(other) === undefined)
  ) {
    return undefined;
  }

  const earlier = others.filter((other) => {
    const otherAt = postedAt(other) as number;

    return otherAt < at || (otherAt === at && other.id < bite.id);
  });

  if (earlier.length === 0) {
    return { moment: 'first-bite' };
  }

  const { countryCode } = bite;

  if (
    countryCode &&
    earlier.every((other) => other.countryCode !== countryCode) &&
    earlier.some((other) => !!other.countryCode)
  ) {
    return { moment: 'first-country', countryCode };
  }

  return undefined;
};
