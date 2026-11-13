# UC - Find BiteTribe Through A City Landing Page

## Status

**Level:** L1

Supported, and live: epic [#1487]'s pages were published on 12 November 2026, fifteen
cities in `bitetribe.app/eat/sitemap.xml`. A published page answers at
`bitetribe.app/eat/<city>` with three to five Bites from that city, structured data
for search engines, a published-set sitemap, and links into the app that the app
attributes to the page. What is not built is the hand-off to an installed app: a phone
with BiteTribe installed opens the page's links in the browser (see `Flow`). The request contract - status codes, caching, the document
and what the page carries - is owned by
[Implementation - Web Search And Social Metadata](../implementation/web-search-and-social-metadata.md#city-landing-pages).
Curating a page is not this page's behaviour; it is `UC-OPS`.

## Goal

Somebody who has never opened BiteTribe finds it through a city they are eating in or
searching for: a search result, a shared link or the Instagram account leads to one
public page of good Bites in that city, readable without an account, and from there to
the app or the stores. The page is a marketing surface: it exists to bring new people to
BiteTribe, and to make BiteTribe findable in search engines such as Google for the cities
it covers.

This page owns what the page offers its reader and a crawler, and the step from the page
into the app. It does not own the page's content, which an Operator curates in
[UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md).

## Actors

- **Bite Creator** - acts only when already signed in on the device: the call to action
  lands them on the Home feed, and a Bite entry on that Bite. The app asks for a member
  session and checks no role, so this is every signed-in account, a Restaurant Owner's or
  an Operator's included, since Bite Creator is the base every member holds. An anonymous
  table guest session counts as signed out.
- **Operator** - not an actor here, and named because every page this one serves was
  written, published or withdrawn by an Operator in `UC-OPS`. Nothing on the page reaches
  back to the admin app.
- The page is read by somebody with **no account at all**, and by search-engine crawlers.
  Neither is an actor: [User Roles](../product/user-roles.md) lists the _unauthenticated
  visitor_ under _Not roles_, and `/eat/**` is one of the open routes it names. A crawler
  reads the same document as a person, plus the sitemap.

## Flow

- A reader requests `/eat/<city>`. A published page answers with the page; a withdrawn
  one answers `410 Gone`, so a search engine drops it; a draft, an unknown city or any
  other path shape answers `404`. A second name for a city, such as `/eat/koeln`, answers
  with a permanent redirect to its one page ([#1974]).
- The page lists three to five Bites in the Operator's order, each as its photo, its name
  and where it was eaten. What is shown is the copy taken when the page was published,
  so a Bite changed or removed later does not change or break the page.
- A crawler finds every published page in `/eat/sitemap.xml` and reads each page's title,
  description, canonical URL, social preview tags, and one structured-data list of the
  Bites as dishes at restaurants ([#1491]). A newly published page reaches the sitemap
  within minutes ([#1980]).
- The reader follows the one call to action, "Open BiteTribe", or a Bite entry
  ([#1492]). Both carry the city, so the app records that the visit came from that page
  before it routes anywhere. A signed-in member lands on the Home feed or on the Bite,
  after the onboarding gate if they have not finished onboarding; a signed-out reader lands
  on the start page, and a Bite they chose opens after they sign in.
- **Intended, not built:** on a phone with BiteTribe installed, the links open the app at
  the Bite, or at a page of its own for the city, instead of the browser. Today they open
  the browser, because the app claims only `/s/bite/*`, `/t/*` and `/m/*` as its links. No
  issue owns this yet; it is `[Secondary]`, see `MVP Classification`.
- The reader can instead go to either store through its badge, or scan its QR code on a
  wide screen, or open the BiteTribe Instagram account from the header ([#1978]).
- The page itself sets no cookie, stores nothing and runs no analytics script; the
  attribution happens in the app.

## Open Product Questions

- **Does a city page lead to sign-ups?** The app records the arrival from a page, not what
  the visitor does next; whether a page led to an account is left to a GA4 exploration. A
  gap until the pages are judged by conversion rather than arrivals.
- **A second language.** A page is written in one language, which sets `<html lang>`.
  Pages in further languages, and the `hreflang` links between them, are likely but not
  planned.
- **Impressum.** Whether an editorial page needs one is open in [#1979]. The pages went
  live on 12 November 2026 without one, because the maintainer waived the gate; see
  [Current State - Open Questions](../current-state/open-questions.md).
- **A domain page for the city landing page.** The `landingPages` document has its own
  lifecycle (draft, published, withdrawn) and aliases, and is treated as an implementation
  detail for now. It earns a domain page if it grows in importance.

## Authorization

The page and the sitemap are open to everyone and need no account. They are rendered by a
Cloud Function that reads the published document with admin credentials, so no security
rule or App Check setting was loosened for them, and a page that is not published is never
revealed, not even through one of its alias names. Everything past the call to action is
the app's own authorization, unchanged.

## MVP Classification

**[MVP]** - the page itself: what a visitor and a crawler get at `/eat/<city>`, and the
links into the app and the stores; epic [#1487] is `P0`.
**[Secondary]** - the hand-off to an installed app (the `Intended, not built` bullet in
`Flow`). It makes the step into the app smoother, but the page reaches new people
without it.

## App Store Review Area

Not relevant, because the page is served on the web by a Cloud Function and changes no app
binary, permission, privacy label or store listing. Its store badges link to the existing
listings.

## Supported Evidence

- `apps/bite-tribe-firebase/functions/src/functions/web/render-city-page.ts` - the page,
  the redirects and the sitemap, reached through the `/eat/**` rewrite in `firebase.json`.
- `apps/bite-tribe-firebase/functions/src/functions/shared/utils/render-landing-page.ts` -
  the document, its structured data and its links into the app.
- `libs/bite-tribe/shell/src/lib/city-page-attribution.ts` - the app reads the city off the
  arriving link and logs `city_page_arrived`; see
  [Implementation - Analytics Events](../implementation/analytics-events.md).
- `apps/bite-tribe-firebase/functions/src/functions/web/__specs__/render-city-page.spec.ts`.

## Related GitHub Scope

- Epic [#1487] - city landing pages.
- Issue [#1489] - serve a city landing page from an `/eat` rewrite.
- Issue [#1491] - structured data and a published-set sitemap.
- Issue [#1492] - link a city landing page into the app with an attributable call to
  action.
- Issue [#1493] - the city landing page contract in the web metadata page.
- Issue [#1974] - let a city page answer under alias names with a redirect.
- Issue [#1978] - link the city landing pages to the BiteTribe Instagram account.
- Issue [#1980] - let the city page sitemap expire within minutes.
- Issue [#1490] - curating a page, which belongs to `UC-OPS`.

## Related Domains

- [Bite](../domain/bite.md)

## Related Pages

- [Implementation - Web Search And Social Metadata](../implementation/web-search-and-social-metadata.md)
- [Implementation - Analytics Events](../implementation/analytics-events.md)
- [Marketing - Social Media Channels](../marketing/social-media-channels.md)
- [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md)
- [UC - Inspect Bite Details](uc-inspect-bite-details.md)
- [User Roles](../product/user-roles.md)

[#1487]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1487
[#1489]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1489
[#1490]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1490
[#1491]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1491
[#1492]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1492
[#1493]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1493
[#1974]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1974
[#1978]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1978
[#1979]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1979
[#1980]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1980
