# Implementation - Web Search And Social Metadata

## Purpose

This page owns what search engines and link unfurlers read when they reach the
BiteTribe web app: the canonical host, the document metadata, the document
title, `robots.txt`, both sitemaps, the Open Graph image, and the public city
landing pages.

[Implementation - Store Listing Assets](store-listing-assets.md) owns the approved copy. This page owns
where that copy is served on the web, so the stores and the site cannot drift
apart. Change a sentence there first, then here.

Added 1 September 2026 for
[issue #1454][#1454].
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

**Updated 19 September 2026 by [#345].** The migration [#1454] deferred is done:
`handleSharedLinkToBite` and the in-app share sheet now build every URL from the
canonical host, so a share page declares its canonical on `bitetribe.app` and
hands the reader on to it.

`bite-tribe.web.app` is still not a stray alias, and still cannot be removed. It
is the support URL in App Store Connect, and - the reason that matters most - it
is the host in every share link sent before this change, sitting in message
threads that will outlive several releases. Those links have to keep opening the
app, so the host stays registered as a verified App Link on both platforms
alongside the canonical one.

The rule to carry forward: **hosts are added here, never swapped.** An address
this product has ever published is an address it keeps answering.

### Which Hosts Open The App

All three hosts are registered for both deep-link paths, on both platforms
([#345], 19 September 2026):

| Path           | What it is                                            |
| -------------- | ----------------------------------------------------- |
| `/s/bite/<id>` | A shared Bite                                         |
| `/t/<token>`   | A scanned table QR code, printed on physical stickers |

Before this, only `bite-tribe.web.app` + `/s/bite` was registered, so a scanned
table code always opened the browser even with the app installed - the sticker
carries `bitetribe.app/t/<token>`, which matched neither the host nor the path.
The in-app handler in `app.component.ts` had been ready since [#1101]; it was
simply never reached, because the OS never delivered the URL.

Both paths are registered on all three hosts rather than each path on the host
that emits it, because all three serve the same build: a `/t/` link that reaches
a guest on any of them should open the app rather than fall to the browser for a
reason no guest can see.

On Android this is **one `<intent-filter>` per host**, not one filter listing all
three. `autoVerify` is evaluated per filter, so the split keeps a host that fails
verification from taking the other two down with it.

The two files that have to agree with each other and with the manifest are
`apps/bite-tribe/src/.well-known/assetlinks.json` and
`apps/bite-tribe/src/.well-known/apple-app-site-association`; both are served
from every host, because all three serve the same build.

### Both Files Live Under `.well-known`, And Hosting Must Not Generate Them

Apple fetches `https://<host>/.well-known/apple-app-site-association` and only
that path. The build also emits a copy at the site root, which older clients
used, but the root copy proves nothing: a device reads the `.well-known` one.

**`appAssociation` in `firebase.json` has to be `NONE`.** Left unset it defaults
to `AUTO`, and Hosting then generates its own association file for any
`.well-known` path the deploy does not fill. Until [#1651] that is exactly what
happened - the repository's file was emitted at the site root only, and every
host served a generated `apple-app-site-association` at `.well-known` declaring
`"paths": ["NOT /__/auth/action/", "NOT /__/auth/handler/", "NOT /_/*", "/*"]`.
The generated file carried the correct `appID`, so Universal Links could still
open the app - by claiming **every** path, rather than the three the repository
declares. `assetlinks.json` was unaffected because it was always deployed at
`.well-known`, which is also why a deployed file is the evidence that `AUTO`
fills gaps rather than overriding what it finds.

Both files need an explicit `Content-Type: application/json` header, which is
what the `headers` block in `firebase.json` is for - Hosting serves an
extensionless file as `application/octet-stream` otherwise, and Apple rejects
it.

The iOS `appID` must carry the Team ID: `DJ2XQYP3NB.com.bitetribe.app`. It was
written as the bare bundle id from [#628] until [#345], which is invalid - so
Universal Links had almost certainly never worked on iOS, for share links
either.

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
| `twitter:site`                                                               | `@bitetribeapp`, added under [#1455]                    |
| `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt` | Mirror the Open Graph values                            |

They are static on purpose. An unfurler never runs the app's JavaScript, and a
crawler reads this document before Angular has bootstrapped. Anything the app
would set at runtime is invisible to the clients this metadata exists for.

`og:image` is absolute. Unfurlers do not resolve relative image URLs.

`twitter:site` arrived after the rest, under
[issue #1455][#1455],
because [#1454] had no account to name. The handle and the constraint that it
must not ship before the X account is registered both live in
[Implementation - Social Media Channels](social-media-channels.md).

## The Two Runtime Exceptions

Both live in `libs/bite-tribe/shell` and are registered in `app.config.ts`.

### provideCanonicalUrl

`canonical-url.ts` narrows `link[rel=canonical]` to the active route after
navigation. Only Googlebot, which does render JavaScript, ever sees the narrowed
value.

It exists because the static sitemap lists four pages while the static tag claims all of
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
open work and is not tracked by [#1454].

## robots.txt And sitemap.xml

Both live in `apps/bite-tribe/public`, which the `public` asset entry in
`apps/bite-tribe/project.json` copies to the site root. The folder was created by
[#1454]; the build already referenced it.

There are two sitemaps, and each owns its own URLs:

| Sitemap                                 | Owns                                                                 | Written by                                           |
| --------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| `https://bitetribe.app/sitemap.xml`     | The four Angular routes that render without a session                | Hand, as the static file in `apps/bite-tribe/public` |
| `https://bitetribe.app/eat/sitemap.xml` | Every published city landing page, with `lastmod` from `publishedAt` | `renderCityPage`, from the published set             |

The static `sitemap.xml` lists four URLs: the root, `/support`, `/privacy` and
`/account-deletion`. Those are the Angular routes that render without a
session; the app is a single-page app behind a login, so no other route has
anything to show a crawler. The city landing pages are not Angular routes and
never appear in it - a growing, operator-published set cannot live in a static
file - so they have the second sitemap, described under
[City Landing Pages](#city-landing-pages).

`robots.txt` allows everything except the authenticated surfaces, which render a
redirect to `/start` for a signed-out crawler and would otherwise be indexed as
thin duplicates of the start page. Two prefixes are deliberately allowed, each
because it is server-rendered by a function and serves its own title,
description and image: `/s/bite/<id>`, the shared-link function, and `/eat/`,
the city landing pages. The file says so in a comment, so neither is added to
the disallow list by symmetry with the app routes. It carries two `Sitemap:`
lines, one per sitemap above.

**A new public Angular route needs three edits: the static sitemap,
`robots.txt`, and `SELF_CANONICAL_PATHS` in `canonical-url.ts`.** A new
function-served route needs none of the third: Angular never bootstraps on it,
so the function writes its own canonical, and it reaches a sitemap the way the
city pages do rather than through the static file.

## The Download Link

**`https://bitetribe.app/download` is the one link that belongs in a post, a
story, a bio, a caption or a QR code.** Added 19 September 2026 for
[issue #1628][#1628].

It answers with a `302` chosen from the visitor's own `User-Agent`:

| Visitor                    | Redirect                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| iPhone, iPad or iPod       | `https://apps.apple.com/app/id6746098595`                         |
| Android                    | `https://play.google.com/store/apps/details?id=com.bitetribe.app` |
| Desktop, unknown, no agent | `https://bitetribe.app/`                                          |

The App Store URL carries no storefront segment, so the visitor lands in their
own country's store. The desktop fallback is the start page because neither
store has anything to install there; it is the page that carries the store QR
codes from [#1453].

### Why A Function

**Firebase Hosting cannot branch a redirect on a request header.** A `redirects`
entry in `firebase.json` is static, so the choice has to be made by code. The
endpoint is `handleDownloadLink` in
`apps/bite-tribe-firebase/functions/src/functions/web/handle-download-link.ts`,
reached through two rewrites above the catch-all `**` in the `bite-tribe`
hosting target - the same shape as `/s/**` to `handleSharedLinkToBite`.

A static page with a script was the alternative and was rejected: this link is
opened mostly from inside the Instagram and Facebook in-app browsers, which is
exactly where a script-based redirect is least reliable. A server redirect needs
no client code and works the same in every one of them.

### The Two Things That Make It Fail Silently

- **The CDN.** Hosting caches in front of the function, and the answer depends on
  a request header. The function sets `Cache-Control: no-store` and
  `Vary: User-Agent`; without them, one visitor's platform is served to the next
  one, with no error anywhere.
- **`302`, not `301`.** A permanent redirect is cached by the browser itself, so
  a phone that first opened the link in a desktop-mode browser would keep the web
  fallback for good.

### What It Deliberately Does Not Touch

- **The apps must not capture `/download`.** Android verifies App Links only for
  the `/s/bite`, `/t/` and `/m/` path prefixes, and `apple-app-site-association`
  lists `/s/bite/*`, `/t/*` and `/m/*`, so the path stays in the browser on a
  device with the app installed. Both files are unchanged by [#1628] and adding `/download` to either
  would break the link on exactly the phones it exists for.
- **`robots.txt` and `sitemap.xml`.** The three-edit rule above is for a new
  Angular route. `/download` is not one - it never reaches the bundle, and a
  `302` is not a page to index - so neither file, nor `SELF_CANONICAL_PATHS`,
  has anything to say about it.
- **An iPad in Safari's default desktop mode** sends a Macintosh user agent that
  nothing on the server can tell from a Mac, and gets the web fallback. That is
  accepted rather than worked around; the start page carries both QR codes.

### Deploying It

The two halves ship from different CI jobs and neither waits for the other.
`deploy-functions` publishes the function on a push to `develop`, and
`deploy-bite-tribe` publishes the `firebase.json` rewrite. The link answers only
once **both** have run: the rewrite without the function is a `404`, and the
function without the rewrite is reachable only at its Cloud Functions URL.

## City Landing Pages

**`https://bitetribe.app/eat/<city>`, for example `/eat/berlin`, is a public,
server-rendered list of three to five Bites in one city, curated in the admin
app.** One page per city: the city is the page's id and its whole URL. A longer
`/eat/<city>/<slug>` with several lists per city was built first and dropped on
12 November 2026 for the shorter URL; a second list per city could come back
under it later without breaking `/eat/<city>`. A bare `/<city>` was rejected:
Hosting routes by fixed pattern, so it would need either a deploy per city or a
catch-all that sends every app route through the function first. Added 12 November
2026 by epic [#1487]: the page in [#1489], the editor in [#1490], the structured
data and sitemap in [#1491], the links into the app in [#1492].

### Rendered By A Function

`renderCityPage` in
`apps/bite-tribe-firebase/functions/src/functions/web/render-city-page.ts`,
reached through the `/eat/**` rewrite on the `bite-tribe` hosting target, next
to `/s/**`. It reads one `landingPages` document with the Admin SDK and returns
a complete HTML document, so the browser never opens a Firestore connection:
the security rules and App Check are not in the request path, and neither was
loosened for it. The `i18n` block on the hosting target does not interfere with
the rewrite; that was checked against the emulator with `Accept-Language: de`.

| Request                                                      | Answer                                       | `Cache-Control`                                                    |
| ------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------ |
| `/eat/<city>`, `status: published`                           | `200`, the page                              | `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` |
| `/eat/<city>`, `status: withdrawn`                           | `410 Gone`, so a search engine drops the URL | `public, max-age=60, s-maxage=60`                                  |
| `status: draft`, an unknown city, or any other shape of path | `404`                                        | `public, max-age=60, s-maxage=60`                                  |
| `/eat/sitemap.xml`                                           | `200`, the published set                     | as a published page                                                |

The short cache on `404` and `410` is so a page published moments after a
crawler asked for its URL is not hidden for an hour. A path that is not
`/eat/` followed by one segment in the editor's city shape answers `404`
without reading Firestore.

### The Document

`landingPages/<city>`, written only by the operator callables
(`saveLandingPage`, `setLandingPageStatus`); there is no client rule for the
collection.

| Field                                   | Meaning                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `city`                                  | The document id and the URL segment, `[a-z0-9-]`. Fixed once saved; `cityName` is how a reader sees it |
| `countryCode`, `locale`                 | ISO country and the language of the page's prose, which sets `<html lang>`                             |
| `status`                                | `draft`, `published` or `withdrawn`                                                                    |
| `title`, `metaDescription`, `intro`     | The operator's text. All three are required to publish                                                 |
| `items`                                 | The snapshot: three to five Bites, in order                                                            |
| `biteIds`                               | The editor's selection, kept only so it can reopen; the page never reads it                            |
| `publishedAt`, `updatedAt`, `updatedBy` | Server timestamps and the operator's uid                                                               |

**An entry is a Bite, shown as its photo, its name and where it is** -
`biteId`, `name`, `imageUrl` (the Bite photo), `place` and `locality` (the
Bite's city). Decided on [#1487] on 12 November 2026, in place of the
restaurant-and-sentence entries the epic first proposed.

**`items` is a snapshot, not a join.** Saving and publishing copy each Bite
into it; the page renders the copy. A Bite renamed, delisted or deleted after
publishing does not change or break a page that is already indexed. A Bite
that is missing or not listable is refused by id at save time rather than
dropped. Publishing re-snapshots, so what goes live is the Bites as they are
then; an edit to a page that is already live goes live with the save and is
held to the same bar.

### What The Page Carries

- Its own title, meta description, canonical on `bitetribe.app`, Open Graph
  and Twitter tags. The image is the first Bite's photo, an absolute Storage
  URL.
- The app's logo beside the wordmark in the header, loaded from
  `/assets/icons/logo.svg` of the web build.
- One JSON-LD block: an `ItemList` of the Bites in order. Each entry is the
  `Restaurant` the Bite was eaten at, with a city-level `PostalAddress` (a Bite
  carries no street), holding the dish as a `MenuItem` on its `Menu`. The JSON
  escapes every `<`, so no text can close the `<script>` element. It is the
  only script on the page.
- One primary call to action, "Open BiteTribe", to `/?city_page=<city>`; and
  each Bite links to `/bite/<id>?city_page=<city>`. A member lands on the Home
  feed or the Bite; a signed-out visitor is sent to `/start` by `authGuard`,
  which remembers a Bite and opens it after sign-in. The App Store and
  Google Play badges from [#1453] link to the store listings, served from the
  same `/assets/store/` files the start page uses; Apple's white badge replaces
  the black one in dark mode. On a wide screen each badge sits under its QR
  code beside the button; a phone gets the button and the two badges as a bar
  pinned to the bottom, without the codes, since a phone cannot scan its own
  screen.
- **No analytics, cookie or storage.** The visit is attributed at the
  destination instead: the consumer app logs `city_page_arrived` from the
  `city_page` parameter before the first navigation. See
  [Implementation - Analytics Events](analytics-events.md).

Every text field is escaped with `escapeHtml`, which replaces every occurrence
since [#1488]. The share stub and the page share `renderSocialMeta` for their
head tags; only the share stub redirects.

### Not Yet

- A phone with the app installed opens these links in the browser: the
  associated paths are `/s/bite/*`, `/t/*` and `/m/*`, not `/` or `/bite/*`.
- Pages are written in one language. `hreflang` arrives with the second.
- Whether an editorial page needs an Impressum is open; see
  [Current State - Open Questions](../current-state/open-questions.md).

## The Open Graph Image

`apps/bite-tribe/src/assets/social/og-image.jpg`, `1200x630`, about 138 KB.

It is the Play feature graphic from
[`ssot/assets/store-listing/feature-graphic/feature-graphic.png`](../assets/store-listing/feature-graphic/feature-graphic.png) letterboxed to
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

- **Per-route Open Graph tags in the Angular app.** Unfurlers do not run the
  app, so a shared link to any in-app route unfurls with the site card. Two
  function-served routes unfurl with their own content and carry their own
  tags: `/s/bite/<id>`, rendered by `handleSharedLinkToBite`, and every city
  landing page under `/eat/`, rendered by `renderCityPage`.
- **Moving the `bite-tribe.web.app` references.** Done on 19 September 2026 by
  [#345]; see the canonical host section. The host itself stays registered.
- **`manifest.webmanifest`.** It still calls the app `bite-tribe` and carries no
  description. That is the PWA install name, not search metadata, and it is a
  separate defect against the spelling rule in
  [Implementation - Store Listing Assets](store-listing-assets.md).
- **The business app.** `apps/bite-tribe-business/src/index.html` has the same
  gap. It is not a public front door and was out of scope.

## Verification

Once deployed:

- Facebook's sharing debugger and Google's Rich Results test should both parse
  `https://bitetribe.app/` without errors.
- `https://bitetribe.app/robots.txt` and `https://bitetribe.app/sitemap.xml`
  should resolve on all three hosts.
- After the first city page is published, Google's Rich Results test should
  parse it without errors, and `https://bitetribe.app/eat/sitemap.xml` should be
  submitted in Search Console as a second sitemap.
- The Google snippet only changes after a recrawl. Submit the sitemap in Search
  Console rather than waiting.

## Related Pages

- [Implementation - Store Listing Assets](store-listing-assets.md)
- [Implementation - Social Media Channels](social-media-channels.md)
- [Implementation - Localization](localization.md)
- [Implementation - Analytics Events](analytics-events.md)
- [Architecture - Overview](../architecture/overview.md)
- [Current State - Release State](../current-state/release-state.md)

[#345]: https://github.com/muhammedgaygisiz/travellers-apps/issues/345
[#628]: https://github.com/muhammedgaygisiz/travellers-apps/issues/628
[#1101]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1101
[#1453]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1453
[#1454]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1454
[#1455]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1455
[#1628]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1628
[#1651]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1651
[#1487]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1487
[#1488]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1488
[#1489]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1489
[#1490]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1490
[#1491]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1491
[#1492]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1492
