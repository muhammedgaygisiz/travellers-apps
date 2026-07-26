# UC - See Ads As A Free User

## Status

Next to implement. Priority P1, post-launch.

## Goal

BiteTribe earns revenue from free users through advertising that fits the feed, respects consent law, and does not make the discovery loop worse.

## Actors

- Food lover on the free tier
- Advertiser
- Pro subscriber, who must see none of this

## Target Flow

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

## Supported Evidence

Not implemented. There is no ad dependency in the workspace. The surfaces this will touch are:

- `libs/bite-tribe/home/page` for the feed and the ad card
- The Capacitor wrappers in `apps/bite-tribe-ios` and `apps/bite-tribe-android`
- The consent surface, which overlaps issue \#989

## Related GitHub Scope

- Issue \#1123 is the epic.
- Issue \#542 is the native in-feed placement, re-scoped from the original one-line issue.
- Issue \#989 covers GDPR consent mode and should produce one consent experience, not two.

## Related Domains

- [[Monetization]]
- [[Subscription]]
- [[Bite]]
- [[User]]
