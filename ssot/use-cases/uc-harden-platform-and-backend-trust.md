# UC - Harden Platform And Backend Trust

## Status

**Level:** L0.
Partly in place, and the rest is tracked elsewhere. App Check is enforced on every callable -
all 42 go through the `onAppCheck` wrapper and not one uses a raw `onCall` - and the control in
front of Google Places is written down rather than implied ([issue-1245](../github/issue-1245.md)). Still open:
`storage.rules` ([#1350]), nothing in CI asserting that the committed rules are deployed
([#1567]), and App Check replay protection on sensitive callables ([#952]).

## Goal

The backend refuses work it cannot attribute, so the food graph is built from what real clients
and real accounts actually did. This page owns which platform-level safeguards exist and what
each is trusted for; which account may read or write a given document is
[Architecture - Firebase](../architecture/firebase.md)'s.

## Actors

- **Bite Creator** - does not act here. Named because every safeguard on this page exists to
  keep what it reads and writes trustworthy, and none of them is a surface it reaches.
- **BiteTribe Operator** - reads App Check monitoring and acts on what it shows. The only human
  action on this page.

## Flow

- App Check, callable backend boundaries, user creation, leaderboard aggregation, search callables, and location queries are production-ready.
- Trust and safety improvements support user-facing discovery reliability.
- A third-party API that App Check cannot reach is protected by the callable in front of it, and the substitute control is documented instead of being implied. Google Places is the worked example: server-side only, App Check enforced and authenticated at the callable, key restricted by API, and monitoring read as expected rather than as an open gap. See [issue-1245](../github/issue-1245.md).

## MVP Classification

**[MVP]** - App Check enforced on every callable, and a documented substitute control in front
of any third-party API App Check cannot reach. Both ship.

**[Secondary]** - App Check replay protection ([#952]), which narrows a window rather than
closing an open door.

Not on this page: the Firestore and Storage rulesets themselves, which belong to
[Architecture - Firebase](../architecture/firebase.md). `storage.rules` is still open to any signed-in account and that is
[#1350], a release risk carried by [Current State - Known Issues](../current-state/known-issues.md) rather than classified here.

## App Store Review Area

Not relevant, because nothing here is a store surface, a permission or a declared data type.
App Check attests the app binary to Firebase and is invisible to a reviewer.

## Supported Evidence

- `onAppCheck` in `apps/bite-tribe-firebase/functions/src/functions/shared/callable-options.ts`,
  which sets `enforceAppCheck` everywhere except the Functions emulator.
- 42 callable modules import it; none declares a raw `onCall`.
- [issue-1245](../github/issue-1245.md) for the Google Places control and the App Check monitoring reading behind it.

## Related Domains

- [User](../domain/user.md)
- [Bite](../domain/bite.md)
- [Restaurant](../domain/restaurant.md)
- [Market Place](../domain/market-place.md)

## Related Pages

- [Architecture - Firebase](../architecture/firebase.md) - the Firestore and Storage rulesets, and the Google Maps
  Platform trust boundary
- [Current State - Known Issues](../current-state/known-issues.md) - where the open platform risks are carried
- [issue-1245](../github/issue-1245.md)

[#952]: https://github.com/muhammedgaygisiz/travellers-apps/issues/952
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
[#1567]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1567
