# UC - See Ads As A Free User

## Status

**Level:** L0.

Next to implement. Priority P1, post-launch. Nothing of it exists, and that absence is
currently a declared fact rather than an omission: no AdMob, User Messaging Platform or App
Tracking Transparency dependency appears in any `package.json`, and
[Implementation - Store Declarations](../implementation/store-declarations.md) answers the advertising question on both stores with
"No AdMob dependency in `package.json`, no ad code in `libs/` or `apps/`". The tier this page
divides on is a display mirror today - `subscriptionTier` gates nothing, as
[UC - Subscribe To BiteTribe Pro](uc-subscribe-to-bitetribe-pro.md) records - so "a Pro subscriber sees no ad" needs the
entitlement of issue [#1126] before it can be enforced rather than merely drawn.

## Goal

BiteTribe earns revenue from free users through advertising that fits the feed, respects consent law, and does not make the discovery loop worse.

This page owns the ad itself: the consent that must resolve before any request, the card in
the feed, its placement rules, and the entitlement check that suppresses it. The advertiser
whose inventory fills the card is external and holds no BiteTribe account, so nothing about
buying or targeting that inventory is on this page. Which capabilities are sold and which are
given away is [Monetization](../product/monetization.md); the subscription that switches ads off is
[UC - Subscribe To BiteTribe Pro](uc-subscribe-to-bitetribe-pro.md); the feed the card is inserted into is
[UC - Discover Bites](uc-discover-bites.md).

## Actors

- **Bite Creator** - acts: resolves the consent form, browses the feed, and sees an ad card
  or, once subscribed, does not. Free and Pro are one role with different entitlements, not
  two roles - `BITE_TRIBE_ROLES` holds only `admin`, `business` and `staff`.

## Flow

- On first launch in a consent-required region, the user resolves the Google User Messaging Platform consent form.
- On iOS, the App Tracking Transparency prompt decides whether ads are personalized.
- The user browses the home feed.
- A native ad card appears at the configured interval, clearly labelled as advertising and never as the first card.
- When no ad is available, the feed shows the next Bite instead of an empty card.
- A Pro subscriber sees no ad card and generates no ad request.

## Boundary Conditions

- No ad request may be fired before consent resolves. This is a hard gate.
- Declining tracking yields non-personalized ads, never a broken feed.
- Ads appear in the home feed only. Not on Bite detail, not in the create-Bite flow, and never positioned so they read as an endorsement of a specific restaurant.
- The PWA shows no ads and no empty ad slots, because AdMob has no web SDK.
- Subscribing removes ads within the session, without a restart.

## MVP Classification

**[Secondary]** - the whole page. Priority P1 and post-launch by its own Status, and
[Current State - Roadmap](../current-state/roadmap.md) puts the whole of [Monetization](../product/monetization.md) there; nothing here is
strictly required for the initial release.

Not on this page: buying or targeting the inventory, which is the advertiser's side and
external to BiteTribe, and the subscription that removes the ad, which is
[UC - Subscribe To BiteTribe Pro](uc-subscribe-to-bitetribe-pro.md)'s.

## App Store Review Area

Relevant, and more of it than anything else in this pass touches.
[Implementation - Store Declarations](../implementation/store-declarations.md) records four answers that this page makes false, each
by name. The content-rating questionnaire answers Advertising "No" on the strength of there
being no AdMob dependency, and that answer was part of what brought the calculated rating
down. The privacy declarations say "Tracking - no, for everything. No AdMob, no ATT usage,
and no `NSUserTrackingUsageDescription` in `Info.plist`", with the note that this is to be
revisited with [epic-1123](../github/epic-1123.md) because requesting the IDFA forces Device ID to be declared as
used for tracking. Apple's App Tracking Transparency prompt and Google's Data safety form
both then need the answers rewritten together, and the Boundary Conditions' hard gate - no ad
request before consent resolves - is the behaviour those declarations would be describing.

## Supported Evidence

Not implemented. There is no ad dependency in the workspace. The surfaces this will touch are:

- `libs/bite-tribe/home/page` for the feed and the ad card
- The Capacitor wrappers in `apps/bite-tribe-ios` and `apps/bite-tribe-android`
- The consent surface, which overlaps issue [#989]

## Related GitHub Scope

- Issue [#1123] is the epic, AdMob advertising for free users, and stage 1 of the
  monetization umbrella [#1121]. Open
- Issue [#542] is the native in-feed placement and carries the ordinal `04` within that epic.
  Open
- Issue [#989], the GDPR consent mode and PII/retention review, is open and should produce one
  consent experience with this page rather than two

## Related Domains

- [Subscription](../domain/subscription.md)
- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the food lover on the free tier this page used to name as an actor
- [Monetization](../product/monetization.md) - the free and paid boundary, and the rule that ads are shown to free users
  only. A product page, not a domain
- [epic-1121](../github/epic-1121.md) - the monetization umbrella, which sequences the three revenue channels and
  holds the product decisions the stage epics share
- [epic-1123](../github/epic-1123.md) - this page's stage epic
- [UC - Subscribe To BiteTribe Pro](uc-subscribe-to-bitetribe-pro.md) - the purchase that switches this off
- [UC - Discover Bites](uc-discover-bites.md) - the feed the ad card is inserted into
- [Implementation - Store Declarations](../implementation/store-declarations.md) - the advertising and tracking answers this page
  makes false
- [Current State - Roadmap](../current-state/roadmap.md) - where Monetization sits relative to launch

[#542]: https://github.com/muhammedgaygisiz/travellers-apps/issues/542
[#989]: https://github.com/muhammedgaygisiz/travellers-apps/issues/989
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1123
[#1126]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1126
