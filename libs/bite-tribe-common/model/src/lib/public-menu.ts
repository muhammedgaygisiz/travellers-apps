import type { Menu } from './menu';

/**
 * A restaurant's menu, read by somebody with no BiteTribe account
 * (GitHub issue #1102).
 *
 * ## Why this is a callable and not a public read rule
 *
 * A menu page needs two documents, and neither is readable without a session:
 * `/menus/{menuId}` and `/restaurants/{restaurantId}`. Opening the first would
 * be defensible on its own - a menu is information a restaurant *wants* read -
 * but opening the second is not, and the page cannot render without a name.
 * `/restaurants/{id}` carries `ownerUserId`, `claimStatus` and the whole
 * `tableOrdering` configuration, and issue #1102's own criterion is that the
 * public path exposes the menu and not restaurant operations data.
 *
 * So the restaurant half is assembled field by field here, exactly as
 * `resolveTableQrToken` assembles its context, and a field added to the
 * restaurant document tomorrow does not reach a stranger by accident.
 *
 * ## Two entry points, one answer
 *
 * A guest arrives either from a scanned table code or from a link the
 * restaurant published. The second is why this takes a `restaurantId` rather
 * than a token: a menu link belongs to a restaurant that may have no floor plan
 * and no printed codes at all, which is issue #1102's "enabling menu-only mode
 * requires no floor plan". The token scopes the *table* context and never the
 * menu - once a restaurant can publish a menu link, a menu is public by
 * decision, and pretending a token restricts it would be theatre.
 */

/** What a guest is told about the restaurant whose menu they are reading. */
export interface PublicMenuRestaurant {
  id: string;
  name: string;
  /** Download URL of the restaurant's picture, where it has one. */
  image?: string;
}

/**
 * Why a menu could not be shown.
 *
 * Short, because reading a menu has few ways to fail: the restaurant is gone,
 * nobody maintains it, or there is nothing written down. Notably **not** here is
 * anything about ordering - a menu-only restaurant is the case this endpoint
 * exists for, not a case it refuses.
 */
export const PUBLIC_MENU_REFUSAL_REASONS = [
  /** No restaurant document behind the id. */
  'restaurantNotFound',
  /**
   * The restaurant is not held by a business account.
   *
   * The same rule the scan applies, and for a reason that survives the absence
   * of ordering: an unheld restaurant's menu is whatever was derived from other
   * people's Bites, and publishing that under the restaurant's name states
   * prices nobody at the restaurant ever confirmed.
   */
  'restaurantInactive',
  /** The restaurant names no menu, or the menu document is gone. */
  'menuMissing',
  /**
   * The menu exists and has nothing written on it.
   *
   * Distinct from the scan's `menuUnavailable`, which asks whether anything can
   * be *ordered* today. Nothing can be ordered from a menu whose every dish is
   * marked off, and that menu is still worth reading - so this asks the weaker
   * question the reader actually cares about: is there anything here at all.
   */
  'menuEmpty',
] as const;

export type PublicMenuRefusalReason =
  (typeof PUBLIC_MENU_REFUSAL_REASONS)[number];

/** A menu a guest may read. */
export interface PublicMenuResolved {
  ok: true;
  restaurant: PublicMenuRestaurant;
  /**
   * The menu as stored, with an id on every category, item and variant.
   *
   * Passed through `withMenuIds` by the backend, so a menu written before issue
   * #1099 renders by id here like any other. The ids are not persisted by this
   * read - it writes nothing - which means an unmigrated menu gets fresh ids on
   * each read. Nothing public depends on them surviving between reads; the
   * cart of issue #1103 does, and it reads through the same backfill the owner's
   * next save persists.
   */
  menu: Menu;
}

/** A menu that could not be shown, and why. */
export interface PublicMenuRefused {
  ok: false;
  reason: PublicMenuRefusalReason;
}

/** What `loadPublicMenu` answers with. */
export type PublicMenuResult = PublicMenuResolved | PublicMenuRefused;

/** What the client sends. */
export interface LoadPublicMenuRequest {
  restaurantId: string;
}

/**
 * Whether a menu came back, as a type guard.
 *
 * One function rather than an `ok === true` at each call site, so a screen
 * narrows the union instead of reaching into a field that is only sometimes
 * there.
 */
export const isPublicMenuResolved = (
  result: PublicMenuResult,
): result is PublicMenuResolved => result.ok;

/**
 * Whether a menu has anything on it to read is deliberately **not** here.
 *
 * The backend gates on it before answering, so a client that received a menu
 * already knows there is something on it - and a second copy of the rule would
 * be a second thing free to disagree with the one that decided. The backend's
 * is `hasReadableContent` in `load-public-menu.ts`.
 */
