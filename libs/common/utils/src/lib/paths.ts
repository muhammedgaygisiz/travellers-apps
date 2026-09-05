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
  // Where `roleGuard` sends a signed-in account that lacks the role a route
  // requires. It is a destination rather than a bounce back to `START`, so the
  // account is told what it is missing instead of being cycled through the
  // login it has already completed (issue #1469).
  NO_ACCESS: 'no-access',
};
