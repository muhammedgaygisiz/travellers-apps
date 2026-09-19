import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import { BITE_TRIBE_ORIGIN } from '../shared/utils/bite-tribe-origin';

/**
 * The one link that belongs in a post, a story, a bio or a QR code.
 *
 * Instagram allows a single link sticker per story, a bio shows only the first
 * link, and a caption cannot be tapped at all - so the launch story of
 * 16 September 2026 (issue #913) had to be posted twice, once per store. This
 * endpoint answers `https://bitetribe.app/download` with a redirect chosen from
 * the visitor's own `User-Agent`, so one link serves both stores.
 *
 * It is a function rather than a `redirects` entry in `firebase.json` because
 * Firebase Hosting cannot branch a redirect on the user agent, and rather than a
 * page with a script because the in-app browsers this link is mostly opened in
 * are exactly where a script-based redirect is least reliable.
 */

/** No storefront segment, so the visitor lands in their own country's store. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6746098595';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.bitetribe.app';

/**
 * Neither store has anything to offer a desktop visitor, so they get the web
 * app's start page, which carries the store QR codes from issue #1453.
 */
export const WEB_FALLBACK_URL = `${BITE_TRIBE_ORIGIN}/`;

/**
 * `iPad` and `iPod` are listed next to `iPhone` because the App Store listing
 * serves all three. An iPad running Safari in its default desktop mode is not
 * among them: it sends a Macintosh user agent that nothing on the server can
 * tell from a Mac, and it gets the web fallback.
 *
 * Instagram's in-app browser keeps the platform token and appends its own, so
 * `... (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) ... Instagram 336.0.0.32.90`
 * and `... (Linux; Android 14; SM-S911B ...) ... Instagram 336.0.0.34.92 Android`
 * are matched by these two patterns rather than by a rule of their own.
 */
const IOS_PATTERN = /\b(iPhone|iPad|iPod)\b/i;

/**
 * Checked after iOS. Facebook's iOS browser carries the string `FBAN/FBIOS`
 * alongside the iPhone token and nothing that reads as Android, so the order
 * costs nothing today and keeps a future dual-token agent on the platform its
 * hardware token names.
 */
const ANDROID_PATTERN = /\bAndroid\b/i;

export const resolveDownloadTarget = (
  userAgent: string | undefined,
): string => {
  if (!userAgent) {
    return WEB_FALLBACK_URL;
  }

  if (IOS_PATTERN.test(userAgent)) {
    return APP_STORE_URL;
  }

  if (ANDROID_PATTERN.test(userAgent)) {
    return PLAY_STORE_URL;
  }

  return WEB_FALLBACK_URL;
};

export const handleDownloadLink = onRequest((req, res) => {
  const userAgent = req.get('user-agent') ?? undefined;
  const target = resolveDownloadTarget(userAgent);

  // The answer depends on a request header, and Hosting's CDN sits in front of
  // it. Without both of these one visitor's platform decides the next
  // visitor's, which is the single way this endpoint can fail silently.
  res.set('Cache-Control', 'no-store');
  res.set('Vary', 'User-Agent');

  logger.info('handleDownloadLink: resolved store', { target });

  // 302 rather than 301: a permanent redirect is cached by the browser itself,
  // and a phone that first opened the link on a desktop-mode browser would keep
  // the fallback.
  res.redirect(302, target);
});
