/** Navigation targets emitted by the page's header menu. */
export type PageMenuTarget =
  | 'settings'
  | 'about'
  | 'profile'
  | 'migrations'
  | 'my-bites'
  | 'my-bucketlists'
  | 'market-place'
  | 'gallery'
  | 'leaderboard';

/**
 * Toggles for the items shown in the page's header menu popover.
 * Unspecified fields fall back to {@link DEFAULT_PAGE_MENU_CONFIG} (all off).
 */
export interface PageMenuConfig {
  settings?: boolean;
  about?: boolean;
  myBites?: boolean;
  myBucketlists?: boolean;
  myProfile?: boolean;
  migrations?: boolean;
  marketPlace?: boolean;
  gallery?: boolean;
  leaderboard?: boolean;
  /** Hides the login/logout entry in the menu. */
  hideAuth?: boolean;
}

/**
 * Toggles for the page's own chrome (header, footer, content width).
 * Unspecified fields fall back to {@link DEFAULT_PAGE_CHROME_CONFIG}.
 */
export interface PageChromeConfig {
  enableBackButton?: boolean;
  showHeaderMenu?: boolean;
  showFooter?: boolean;
  showAddButton?: boolean;
  fullWidth?: boolean;
}

export const DEFAULT_PAGE_MENU_CONFIG: Required<PageMenuConfig> = {
  settings: false,
  about: false,
  myBites: false,
  myBucketlists: false,
  myProfile: false,
  migrations: false,
  marketPlace: false,
  gallery: false,
  leaderboard: false,
  hideAuth: false,
};

export const DEFAULT_PAGE_CHROME_CONFIG: Required<PageChromeConfig> = {
  enableBackButton: false,
  showHeaderMenu: true,
  showFooter: true,
  showAddButton: false,
  fullWidth: false,
};
