import { PATH } from 'utils';

/**
 * The pages that read the signed-in user's own Bites: My Bites and My Profile.
 * The load effect and the loading flag both key on it, so the flag cannot be
 * raised for a page whose read never starts (GitHub issue #2073).
 */
export const isOwnBitesUrl = (url: string): boolean =>
  url.includes(PATH.MY_BITES) || url.includes(PATH.MY_PROFILE);
