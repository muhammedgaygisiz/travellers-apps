import { Timestamp } from 'firebase-admin/firestore';

/**
 * A city landing page, stored at `landingPages/<slug>` and served at
 * `https://bitetribe.app/eat/<city>/<slug>` (epic #1487, issue #1489).
 *
 * - `draft`: never served, answers 404.
 * - `published`: served.
 * - `withdrawn`: was published and is not any more, answers 410 so a search
 *   engine drops it rather than retrying a 404.
 */
export type LandingPageStatus = 'draft' | 'published' | 'withdrawn';

/**
 * One entry on the page: a Bite, shown as its photo, its name and where it is
 * - nothing of the feed's reactions, rating or poster.
 *
 * A snapshot taken at publish time rather than a join at render time: a
 * renamed, delisted or deleted Bite or restaurant must not change or break a
 * page that is already indexed.
 */
export interface LandingPageItem {
  biteId: string;
  /** The dish, `Bite.name`. */
  name: string;
  /** The Bite photo, `Bite.imagePath`. */
  imageUrl: string;
  /** The restaurant, `Bite.place`. */
  place: string;
  /** Where the restaurant is, e.g. `Mitte, Berlin`. */
  locality?: string;
}

export interface LandingPage {
  slug: string;
  /** The URL segment, lowercase ASCII, e.g. `berlin`. */
  city: string;
  /** The city as a reader sees it, e.g. `Berlin`. */
  cityName: string;
  countryCode: string;
  /** BCP 47 tag of the page's prose, e.g. `en`. */
  locale: string;
  status: LandingPageStatus;
  title: string;
  metaDescription: string;
  intro: string;
  /** Ordered, three to five Bites. */
  items: LandingPageItem[];
  publishedAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}
