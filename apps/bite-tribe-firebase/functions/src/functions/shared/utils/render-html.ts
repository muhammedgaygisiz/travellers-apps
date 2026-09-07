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

export const renderHtml = (opts: {
  title: string;
  description: string;
  imageUrl: string | undefined;
  canonicalUrl: string;
  redirectUrl: string;
}): string => {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const canonicalUrl = escapeHtml(opts.canonicalUrl);
  const redirectUrl = escapeHtml(opts.redirectUrl);

  const imageMeta = opts.imageUrl
    ? `
        <meta property="og:image" content="${escapeHtml(opts.imageUrl)}">
        <meta name="twitter:image" content="${escapeHtml(opts.imageUrl)}">
      `
    : '';

  // Crawlers: read OG tags in <head>
  // Humans: redirect immediately (and also show a link)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>${title}</title>
  <link rel="canonical" href="${canonicalUrl}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonicalUrl}" />
  ${imageMeta}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
</head>
<body>
  <p>Opening BiteTribe…</p>
  <p><a href="${redirectUrl}">Tap here if you are not redirected</a></p>
</body>
</html>`;
};
