# UC - Find And Run A Mobile Vendor

## Status

**Level:** L0

Specified, not built. Issue [#2134] answered what a venue that moves is in BiteTribe on
2026-11-28; the implementation is epic [#2340], issues [#2341] to [#2347], at P4 and P5.
Nothing on this page exists in the apps yet.

## Goal

Food trucks and street vendors take part in BiteTribe: a guest finds one where it is now,
posts a Bite that counts for it wherever it parked, and can follow it; its owner tells
BiteTribe where it is.

## Actors

- **Bite Creator** - acts: finds a mobile vendor on the map, opens its page, picks it when
  posting a Bite, follows it.
- **Restaurant Owner** - acts: marks a held restaurant mobile, sets its current position by
  hand in the business app, or shares it from the BiteTribe phone app.

## Mobile Vendor Contract

- **What it is.** A Restaurant with the `mobile` flag. It keeps its regular fixed address and
  `position`. A food truck also states the `food-truck` category ([#2131]); a mobile vendor
  may state any category. The rule is on the [Restaurant](../domain/restaurant.md) domain page.
- **The current position.** On top of the fixed one, set by its owner in one of two ways:
  - by hand in the business app ([#2342]), for heavy trucks that move about once or twice a
    day. It is stale at the end of the day in the owner's local time;
  - by tracking from the BiteTribe phone app ([#2345]), for vendors on the move most of the
    time, such as bicycle vendors in Vietnam. It reports about once a minute while the app is
    open and is stale 15 minutes after the last report.
- **Stale means unknown.** A current position past its stale time reads as "location unknown
  right now" everywhere.
- **The map** shows a mobile vendor at its current position and hides it while that is
  unknown ([#2343]). Its page still opens, says where it is now or that this is unknown, and
  shows its fixed address apart from it.
- **Bites are matched by link only** ([#2344]). Create Bite offers a mobile vendor at its
  current position, and picking it links the Bite. Its page, rating, Bites list and the
  owner's dashboard ([#2133]) count the Bites linked to it, wherever they were eaten; distance
  and name do not count for it. Linked Bites are already left out of restaurant candidate
  clustering ([#1523]). Earlier unlinked Bites can be linked by the owner from Guest Bites
  ([#2346]).
- **Following** works as for any restaurant ([#2132]). Followers get no push about a new
  location, as no follower gets a push about a restaurant ([#2318]).

## MVP Classification

**[Secondary]** - BiteTribe works without mobile vendors; they widen who can take part, at P4
and P5 behind the restaurant-owner features of epic [#2123].

## App Store Review Area

Relevant from [#2345]. Tracking uses the existing when-in-use location permission and runs
only while the app is open, so the store declarations stay as they are; that PR records it in
[Implementation - Store Declarations](../implementation/store-declarations.md). Background
tracking ([#2347], P5) needs the Always permission on iOS and Play's background-location
declaration with its review video, and updates the declarations in the same change.

## Out Of Scope

- Schedules or announced future locations.
- Any push to followers about a location.
- A position history for guests.

## Related GitHub Scope

- Issue [#2134] specified mobile venues. Part of epic [#2123].
- Epic [#2340] implements them: [#2341] the model, [#2342] the hand-set position, [#2343]
  the map and page, [#2344] Create Bite and matching by link, [#2345] tracking while the app is
  open, [#2346] linking earlier Bites, [#2347] background tracking.

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

## Related Pages

- [UC - Browse Restaurants And Places](uc-browse-restaurants-and-places.md) - the restaurant
  page a mobile vendor's page extends.
- [UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md)
  - where the owner marks the vendor mobile and sets its position.
- [UC - Detect Restaurant Candidate](uc-detect-restaurant-candidate.md) - why linked Bites
  leave clustering alone.

[#1523]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1523
[#2123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2123
[#2131]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2131
[#2132]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2132
[#2133]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2133
[#2134]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2134
[#2318]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2318
[#2340]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2340
[#2341]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2341
[#2342]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2342
[#2343]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2343
[#2344]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2344
[#2345]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2345
[#2346]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2346
[#2347]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2347
