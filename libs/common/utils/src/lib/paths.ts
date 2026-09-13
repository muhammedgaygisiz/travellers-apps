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
