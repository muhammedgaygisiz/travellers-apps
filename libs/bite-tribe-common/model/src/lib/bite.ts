import type { DietaryLabel } from './dietary-label';
import type { Geopoint } from './geopoint';
import type { Like } from './like';
import type { PositionSource } from './position-source';

/** Who linked a Bite to a menu item (GitHub issue #2216). */
export type MenuItemLinkSource = 'guest' | 'verification' | 'owner';

export interface Bite {
  userId?: string;
  id: string;
  name: string;
  image: string;
  imagePath?: string;
  /**
   * Where the Bite's photo stands (GitHub issues #1168, #1717, #2139). Only
   * `uploaded` is listable. `uploaded` and `refused` are written only by
   * `setBiteImagePathOnUpload`; the client writes `pending` and `failed`.
   */
  imageStatus?: 'pending' | 'uploaded' | 'failed' | 'refused';
  /**
   * Why the image check refused the photo, present only while `imageStatus`
   * is `refused`. Written by `setBiteImagePathOnUpload` alone (issue #2139).
   */
  imageRefusalCategory?: string;
  /**
   * When the backend checks the photo again, in milliseconds since the epoch,
   * while its last image check could not run (GitHub issue #2142). Present
   * only while the photo waits; the client reads it as a photo still being
   * checked rather than an upload that stalled. Written by the backend alone.
   */
  imageCheckNextAt?: number;
  place: string;
  price: number;
  currency?: string;
  position: Geopoint;
  /**
   * Which source produced {@link position}. Null on Bites written before the
   * source was recorded, which the form reports as an unknown source rather
   * than guessing. See GitHub issue #1266.
   */
  positionSource?: PositionSource | null;
  geohash?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  formatted?: string;
  addressStatus?: 'pending' | 'resolved' | 'failed';
  restaurantId?: string;
  /**
   * The meal this Bite was made from (GitHub issue #1112).
   *
   * Present only on a Bite created from a visit summary, and absent on every
   * other one - which is most of them. It is what lets the nightly reminder
   * know a meal has already become a Bite and stop asking, and it is
   * deliberately **not** the menu-item link: that is `menuItemId`, it points
   * at the dish rather than at the evening, and it is issue #1113's.
   *
   * It says nothing to other readers. A Bite made this way is an ordinary
   * Bite, better sourced.
   */
  visitId?: string;
  /**
   * The dish on the restaurant's menu that this Bite is about
   * (GitHub issue #1113).
   *
   * Set by both paths that know it: a Bite made from an order line, and the
   * "Create Bite" button on a menu item, which has had the `MenuItem` in hand
   * since before this issue. Absent on every Bite somebody typed, which is
   * most of them.
   *
   * It is the **dish** and not the size. "Large Margherita" and "small
   * Margherita" are one thing on a menu and two things to eat, so the rating a
   * guest gave belongs to {@link variantId} while the count under the dish
   * belongs here - which is why the aggregate is kept per menu item and the
   * variant is kept on the Bite.
   *
   * A renamed dish keeps its id, so the link survives. A **deleted** one does
   * not come back, and nothing repairs the Bite: `name` and `place` were
   * copied when it was created, so it reads exactly as it did - the link goes
   * and the record stays.
   */
  menuItemId?: string;
  /**
   * Which size or variant was eaten (GitHub issue #1113).
   *
   * Absent where the dish has no variants, or where the guest chose the dish
   * itself rather than one of them. Nothing aggregates on it yet, and it is
   * here so that a per-variant view stays possible without going back through
   * every Bite - the field is cheap now and unrecoverable later.
   */
  variantId?: string;
  /**
   * Who set {@link menuItemId} (GitHub issue #2216):
   *
   * - `guest` - the Bite's author, from a table order or from a dish's
   *   "Create Bite" button. Absent on Bites linked that way before the field.
   * - `verification` - candidate verification, from the dish name the Bite
   *   gave, when it built the restaurant's Initial Menu from those Bites.
   * - `owner` - the restaurant's owner, on the business app's Guest Bites
   *   page, through `linkBiteToMenuItem`.
   *
   * Guests see no difference between them. It is kept so a label, or a check
   * for owners who link selectively, can be added later from evidence. Only
   * `verification` and `owner` links can be changed by the owner.
   */
  menuItemLinkedBy?: MenuItemLinkSource;
  /**
   * The restaurant's owner said this Bite is about nothing on their menu
   * (GitHub issue #2216), so the Guest Bites page stops offering it. The Bite
   * itself is unchanged and shows everywhere it did.
   */
  menuLinkDismissed?: boolean;
  tags?: string[];
  /**
   * The BiteTribe users the creator ate with (GitHub issue #1915), by uid.
   *
   * Not the free-text {@link tags}: a tagged user is an account. At most ten,
   * never the creator, and only accounts the creator follows with a public
   * profile and no block in either direction may be added - rules enforce the
   * first two, `validateBiteTaggedUsersOnWrite` the rest. Absent on most Bites.
   */
  taggedUserIds?: string[];
  /**
   * What the creator says the dish they ate fits (GitHub issue #2195), from
   * the vocabulary in `dietary-label.ts`. Not the free-text {@link tags}:
   * `#vegan` there stays a tag as typed. It is the creator's claim and is
   * always shown as theirs, never as fact (`RD-DC-1`); a linked menu item's
   * own labels are the restaurant's and are shown beside it, not merged in.
   * Read through `dietaryLabelsOf`, which drops a value the vocabulary does
   * not know. Written only by the Bite's creator, and never sent to
   * `explainBite`. Absent or empty on most Bites.
   */
  dietaryLabels?: DietaryLabel[];
  rating?: number;
  description?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;

  /**
   * The Bite a Create Bite draft was copied from (GitHub issue #2018).
   *
   * Draft only, never stored: the create form submits its own controls plus
   * the provenance `withDraftProvenance` merges, and this is neither. It tells
   * the form how old the copied price is, and tells the submit which Bite to
   * tick off in the poster's bucket lists.
   */
  copiedFrom?: { biteId: string; createdAt?: string };

  //derived attribute
  distance?: string;
  likes?: Like[];
  thumbup?: number;
  drooling?: number;
  mindblown?: number;
  priceInPreferredCurrency?: number;
  priceInPreferredCurrencySymbol?: string;
}
