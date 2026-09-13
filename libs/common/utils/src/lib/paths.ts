export const PATH = {
  START: 'start',
  ONBOARDING: 'onboarding',
  NEW_BITE: 'new-bite',
  MY_BITES: 'my-bites',
  BITES: 'bites',
  BITE: 'bite',
  HOME: 'home',
  EDIT_PROFILE: 'edit-profile',
  PROFILE: 'profile',
  MY_PROFILE: 'my-profile',
  ABOUT: 'about',
  FOLLOWERS: 'followers',
  MY_BUCKETLISTS: 'my-bucketlists',
  RESTAURANT: 'restaurant',
  PLACE: 'place',
  MENU: 'menu',
  PRIVACY_POLICY: 'privacy',
  // Public store-review URL. The App Store's Support URL field takes a page,
  // not an address, and publishes it on the product page.
  SUPPORT: 'support',
  /**
   * The scanned table QR code (GitHub issue #1101).
   *
   * One letter, because the whole address is printed on a sticker and encoded
   * in a QR code: `https://bitetribe.app/t/{token}`. The token is 26 characters
   * of Crockford base32 and the code is denser and more forgiving the shorter
   * the URL is, so every character of path is one the guest's camera has to
   * read in a dim restaurant. `TABLE_SCAN_PREFIX` in the business app's QR
   * sheet is the other half of this constant and has to agree with it.
   */
  TABLE_SCAN: 't',
  /**
   * Ordering at the table the code was scanned at (GitHub issue #1103).
   *
   * A segment under {@link PATH.TABLE_SCAN} rather than a route of its own,
   * because the token is what the screen needs: it re-resolves it on arrival,
   * so a reload, a backgrounded phone or a link the guest kept lands on a page
   * that can still name the restaurant and the table. A top-level route would
   * have had to carry the same token anyway, under a longer address that a
   * restaurant would never print.
   *
   * Never printed on a sticker itself - the guest reaches it by tapping through
   * from the scan - so the extra characters cost no QR modules.
   */
  TABLE_ORDER: 'order',
  /**
   * A restaurant's menu, read without an account (GitHub issue #1102).
   *
   * One letter for the same reason `TABLE_SCAN` is: a restaurant publishes this
   * address as a link and sometimes prints it, and every character costs QR
   * modules. It takes a restaurant rather than a table, because a restaurant
   * that publishes a menu link may have no floor plan and no printed codes at
   * all - which is what "menu-only mode requires no floor plan" means.
   */
  PUBLIC_MENU: 'm',
  // Public store-review URL. It explains the flow; it does not perform it.
  ACCOUNT_DELETION: 'account-deletion',
  // Authenticated in-app flow that actually deletes the account.
  DELETE_ACCOUNT: 'settings/delete-account',
  MARKET_PLACE: 'market-place',
  BITE_TRAIL: 'bite-trail',
  SEARCH: 'search',
  GALLERY: 'gallery',
  LEADERBOARD: 'leaderboard',
  WEEKLY_BITES: 'weekly-bites',
};

/**
 * The route parameter naming the restaurant on the public menu route
 * (GitHub issue #1102).
 *
 * **Deliberately not `restaurantId`**, and it must not be renamed to it. The
 * NgRx router selector in `bite-tribe/store` keys on that exact parameter name,
 * and `RestaurantEffects.loadRestaurantById$` fires on every navigation that
 * carries it - reading `/restaurants/{id}` straight from Firestore, which
 * `firestore.rules` allows only to a signed-in caller. Naming it `restaurantId`
 * therefore put one refused read on the single route whose whole premise is
 * that the reader has no account, on every single load.
 *
 * Shared rather than written twice, because the route that declares it and the
 * service that reads it live in different libraries, and a typo between them
 * shows up as a menu that never loads.
 */
export const PUBLIC_MENU_RESTAURANT_PARAM = 'publicRestaurantId';
