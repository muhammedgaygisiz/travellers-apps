// `&` has to go first: the later replacements introduce ampersands of their
// own, and escaping it last would turn `&lt;` into `&amp;lt;`. Every pattern is
// a global regex - a string pattern replaces only the first occurrence, which
// is what let a crafted Bite name break out of a meta tag (issue #1488).
export const escapeHtml = (s: string): string => {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export interface SocialMeta {
  title: string;
  description: string;
  imageUrl: string | undefined;
  canonicalUrl: string;
}

/**
 * The `<head>` tags a crawler and a link unfurler read: title, canonical, Open
 * Graph and Twitter. Shared by the share stub below and the city landing page
 * (issue #1489), so the two cannot drift apart in how they declare themselves.
 * Every value is escaped here; callers pass raw text.
 */
export const renderSocialMeta = (opts: SocialMeta): string => {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const canonicalUrl = escapeHtml(opts.canonicalUrl);

  const imageMeta = opts.imageUrl
    ? `
  <meta property="og:image" content="${escapeHtml(opts.imageUrl)}" />
  <meta name="twitter:image" content="${escapeHtml(opts.imageUrl)}" />`
    : '';

  return `<title>${title}</title>
  <link rel="canonical" href="${canonicalUrl}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonicalUrl}" />${imageMeta}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />`;
};

/**
 * The unfurl stub behind `/s/bite/<id>`: just enough `<head>` for a link
 * preview, then an immediate redirect into the app. A waypoint rather than a
 * destination, which is why the city landing page has its own template.
 */
export const renderShareStub = (
  opts: SocialMeta & { redirectUrl: string },
): string => {
  const redirectUrl = escapeHtml(opts.redirectUrl);

  // Crawlers: read OG tags in <head>
  // Humans: redirect immediately (and also show a link)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  ${renderSocialMeta(opts)}

  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
</head>
<body>
  <p>Opening BiteTribe…</p>
  <p><a href="${redirectUrl}">Tap here if you are not redirected</a></p>
</body>
</html>`;
};
