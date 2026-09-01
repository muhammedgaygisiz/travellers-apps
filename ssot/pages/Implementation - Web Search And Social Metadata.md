# Implementation - Web Search And Social Metadata

## Purpose

This page owns what search engines and link unfurlers read when they reach the
BiteTribe web app: the canonical host, the document metadata, the document
title, `robots.txt`, `sitemap.xml`, and the Open Graph image.

[[Implementation - Store Listing Assets]] owns the approved copy. This page owns
where that copy is served on the web, so the stores and the site cannot drift
apart. Change a sentence there first, then here.

Added 1 September 2026 for
[issue #1454](https://github.com/muhammedgaygisiz/travellers-apps/issues/1454).
Before it, `apps/bite-tribe/src/index.html` carried thorough PWA plumbing and no
metadata at all, so a Google search for `bitetribe` returned the site as a title
and a `Translate this page` link with no snippet, and every shared link unfurled
as a naked URL.

## Canonical Host

**`https://bitetribe.app` is canonical. Decided 1 September 2026.**

Four hosts answer today:

| Host                 | Response                          |
| -------------------- | --------------------------------- |
| `bitetribe.app`      | `200`, canonical                  |
| `www.bitetribe.app`  | `200`, same build                 |
| `bite-tribe.web.app` | `200`, same build                 |
| `bitetribe.io`       | `301` to `https://bitetribe.app/` |

Three hosts serve the same build. Without a canonical, a search engine treats
them as three pages and splits the ranking signal across them. `bitetribe.app`
was chosen because it is the host Google already indexed and it matches the
`support@bitetribe.app` mailbox.

`bitetribe.io` already redirects and needs nothing.

### The web.app References That Stay

`bite-tribe.web.app` is not a stray alias. It is the host the Android app links
verify against through `.well-known/assetlinks.json`, it is the support URL in
App Store Connect, and `handleSharedLinkToBite` builds both its canonical and
its redirect from it. Those keep working and are deliberately untouched by
#1454; migrating them is separate work, because the redirect target and the
verified host have to move together with a Play Console update.

The consequence to remember: a `/s/bite/<id>` share page still declares a
canonical on `bite-tribe.web.app`, which is now not the canonical host.

## What index.html Carries

`apps/bite-tribe/src/index.html` ships, as static tags:

| Tag                                                                          | Value                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| `<title>`                                                                    | `BiteTribe – Find it. Try it. Share it.`                |
| `meta[name=description]`                                                     | The approved App Store promotional text, 133 characters |
| `link[rel=canonical]`                                                        | `https://bitetribe.app/`                                |
| `og:type`, `og:site_name`                                                    | `website`, `BiteTribe`                                  |
| `og:url`, `og:title`, `og:description`                                       | The canonical root and the same title and copy          |
| `og:image` and its `type`, `width`, `height`, `alt`                          | `/assets/social/og-image.jpg`, `1200x630`               |
| `og:locale`                                                                  | `en_US`                                                 |
| `twitter:card`                                                               | `summary_large_image`                                   |
| `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt` | Mirror the Open Graph values                            |

They are static on purpose. An unfurler never runs the app's JavaScript, and a
crawler reads this document before Angular has bootstrapped. Anything the app
would set at runtime is invisible to the clients this metadata exists for.

`og:image` is absolute. Unfurlers do not resolve relative image URLs.

## The Two Runtime Exceptions

Both live in `libs/bite-tribe/shell` and are registered in `app.config.ts`.

### provideCanonicalUrl

`canonical-url.ts` narrows `link[rel=canonical]` to the active route after
navigation. Only Googlebot, which does render JavaScript, ever sees the narrowed
value.

It exists because the sitemap lists four pages while the static tag claims all of
them are the site root. Without it, `/support` and `/privacy` would be submitted
for indexing and simultaneously declare themselves duplicates.

Self-canonical routes are exactly `support`, `privacy` and `account-deletion` -
the three that render without a session. Everything else, including `/start` and
every authenticated surface, canonicalizes to `https://bitetribe.app/`.

`/start` is deliberately not self-canonical: `/` redirects to it, so it is the
start page reached by a second URL rather than a page of its own.

### provideDocumentTitle

`document-title.ts` replaces Angular's default `TitleStrategy`.

A good `<title>` in `index.html` was not enough on its own. Every route in
`routes.ts` carries a `title`, and the default strategy assigns it to the
document verbatim, so the moment routing started the page a crawler had rendered
was called `Welcome`. None of those route titles name the product.

The strategy renders `<route title> – BiteTribe`, and uses the full site title
for `/` and `/start`, which is the page a search result for the site root
actually shows.

Route titles are still hardcoded English in `routes.ts`. Translating them is
open work and is not tracked by #1454.

## robots.txt And sitemap.xml

Both live in `apps/bite-tribe/public`, which the `public` asset entry in
`apps/bite-tribe/project.json` copies to the site root. The folder was created by
#1454; the build already referenced it.

`sitemap.xml` lists four URLs: the root, `/support`, `/privacy` and
`/account-deletion`. That is every route that renders without a session. The app
is a single-page app behind a login, so nothing else has anything to show a
crawler.

`robots.txt` allows everything except the authenticated surfaces, which render a
redirect to `/start` for a signed-out crawler and would otherwise be indexed as
thin duplicates of the start page. `/s/bite/<id>` is deliberately allowed: it is
the shared-link function, and it serves its own title, description and image.

**A new public route needs three edits: the sitemap, `robots.txt`, and
`SELF_CANONICAL_PATHS` in `canonical-url.ts`.**

## The Open Graph Image

`apps/bite-tribe/src/assets/social/og-image.jpg`, `1200x630`, about 138 KB.

It is the Play feature graphic from
`ssot/assets/store-listing/feature-graphic/feature-graphic.png` letterboxed to
the Open Graph ratio. The feature graphic is `1024x500` and Open Graph wants
`1200x630`, so it is scaled to the full width and padded by 22 pixels top and
bottom on `#1a1c22`, the dark background token from `theme/variables.scss`. The
padding is invisible against the graphic's own dark left side.

Regenerate it from the feature graphic rather than editing it:

```bash
node -e "require('sharp')('ssot/assets/store-listing/feature-graphic/feature-graphic.png').resize(1200, 630, { fit: 'contain', background: '#1a1c22' }).jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile('apps/bite-tribe/src/assets/social/og-image.jpg')"
```

JPEG rather than PNG: the graphic is mostly photograph, and the PNG encode of the
same image is 1 MB against 138 KB.

## Deliberately Not Done

- **Per-route Open Graph tags.** Unfurlers do not run the app, so a shared link
  to any in-app route unfurls with the site card. The one route that unfurls with
  its own content is `/s/bite/<id>`, which is server-rendered by
  `handleSharedLinkToBite` and already carries its own tags.
- **Moving the `bite-tribe.web.app` references.** See the canonical host section.
- **`manifest.webmanifest`.** It still calls the app `bite-tribe` and carries no
  description. That is the PWA install name, not search metadata, and it is a
  separate defect against the spelling rule in
  [[Implementation - Store Listing Assets]].
- **The business app.** `apps/bite-tribe-business/src/index.html` has the same
  gap. It is not a public front door and was out of scope.

## Verification

Once deployed:

- Facebook's sharing debugger and Google's Rich Results test should both parse
  `https://bitetribe.app/` without errors.
- `https://bitetribe.app/robots.txt` and `https://bitetribe.app/sitemap.xml`
  should resolve on all three hosts.
- The Google snippet only changes after a recrawl. Submit the sitemap in Search
  Console rather than waiting.

## Related Pages

- [[Implementation - Store Listing Assets]]
- [[Implementation - Localization]]
- [[Architecture - Overview]]
- [[Current State - Release State]]
