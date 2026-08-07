// Export for testing purposes
export const getHref = (): string => location.href;

/**
 * The pages a visitor passes through on the way in, plus the app root that
 * resolves to one of them. Everywhere else is a page inside the app that the
 * visitor asked for, and being moved off it is a loss.
 */
const AUTH_ENTRY_PATHS = [
  '/',
  '/start',
  '/login',
  '/registration',
  '/forgot-password',
];

const pathOf = (url: string): string => {
  const withoutOrigin = url.replace(/^[a-z]+:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split(/[?#]/)[0];
  const withoutTrailingSlash = withoutQuery.replace(/\/+$/, '');

  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
};

/** Whether the given absolute or router URL addresses a sign-in entry page. */
export const isAuthEntryUrl = (url: string): boolean =>
  AUTH_ENTRY_PATHS.includes(pathOf(url));

/** Whether the browser currently sits on a sign-in entry page. */
export const isAuthEntryPage = (): boolean => isAuthEntryUrl(getHref());
