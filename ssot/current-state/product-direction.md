# Current State - Product Direction

**Last verified:** 2026-11-13

## Purpose

Product Direction names the fronts the product grows along, and groups the
"Next to implement" use cases from [SSOT](../README.md) under them.

It sits between [Mission](../product/mission.md) and [Current State - Roadmap](roadmap.md). Mission says what
BiteTribe does and where it stops. This page says which parts of the product get
better next and why each front matters. The Roadmap owns the phases, and
[Current State - Release State](release-state.md) the dates and launch status;
nothing here carries a date.

## Why It Exists

Product Direction should help answer:

> Which front does this piece of work belong to, and what else belongs with it?

The use-case list in [SSOT](../README.md) is flat. Grouping it makes the shape of the unbuilt
product visible, and makes a use case that fits no front obvious instead of
silently orphaned.

## How To Use This Page

- Every use case under "Next to implement" in [SSOT](../README.md) should appear here exactly once.
- When a use case ships, move it in [SSOT](../README.md) and drop it from the front here.
- When a front has no remaining use cases, remove the front.
- A new use case that fits no existing front means either a missing front or a
  use case that needs re-scoping. Do not add it to the nearest front to make the
  list tidy.
- Epics are listed where one owns the use case. A missing epic link is a real
  gap, not a formatting omission.

## Search That Scales With The Content Graph

- [UC - Complete Universal Search](../use-cases/uc-complete-universal-search.md)

People, bites, restaurants, menus, and curated journeys have to stay findable as
the graph grows, or discovery degrades exactly when there is most to find.

No epic owns this front yet.

## Restaurant And Menu Completeness

- [UC - Contact A Restaurant And Plan A Visit](../use-cases/uc-contact-a-restaurant-and-plan-a-visit.md)
- [UC - Dismiss Restaurant Candidate](../use-cases/uc-dismiss-restaurant-candidate.md) — [epic-1495][#1495]
- [UC - Resolve Candidate Against An Existing Restaurant](../use-cases/uc-resolve-candidate-against-an-existing-restaurant.md) — [epic-1630][#1630]

Restaurant and menu data should carry someone from discovery to a clear next
action: trying a dish, planning a visit, or creating a bite from a menu item.
Restaurant candidates found in Bites are how that data grows, so a candidate
that is wrong or already known has to leave the queue as cleanly as a real one
enters it.

## The BiteTrail Ecosystem

- [UC - Create A BiteTrail](../use-cases/uc-create-a-bitetrail.md)
- [UC - Price A BiteTrail For Sale](../use-cases/uc-price-a-bitetrail-for-sale.md)
- [UC - Add BiteTrail Gamification](../use-cases/uc-add-bitetrail-gamification.md)

Curated journeys turn discovery into intent and progress, and are how creators
eventually earn from local knowledge. See [Bite Trail](../domain/bite-trail.md) and [Market Place](../domain/market-place.md).

No epic owns this front yet.

## Monetization

- [UC - Subscribe To BiteTribe Pro](../use-cases/uc-subscribe-to-bitetribe-pro.md) — [epic-1124][#1124]
- [UC - See Ads As A Free User](../use-cases/uc-see-ads-as-a-free-user.md) — [epic-1123][#1123]
- [UC - Buy A Paid BiteTrail](../use-cases/uc-buy-a-paid-bitetrail.md) — [epic-1125][#1125]
- [UC - Earn From A Paid BiteTrail](../use-cases/uc-earn-from-a-paid-bitetrail.md) — [epic-1125][#1125]

[Monetization](../product/monetization.md) owns the free and paid boundary and the revenue share. All four
sit behind the entitlement foundation in [epic-1122][#1122], under umbrella
[epic-1121][#1121].

## Trust And Data Quality

- [UC - Improve Localization Quality](../use-cases/uc-improve-localization-quality.md) — [epic-738][#738]

Data quality work is product work. Bad location, currency, or language context
weakens trust in every bite it touches.

## Growth And Marketing

- [UC - Share A Bite To Social Media](../use-cases/uc-share-a-bite-to-social-media.md) — [epic-1723][#1723]

BiteTribe grows when people who have never opened it meet it where they already
are: in a search engine, on Instagram, in a friend's shared Bite. This front holds
the work whose purpose is marketing and more users rather than a better app for
existing ones. The city landing pages of [epic-1487][#1487] belong here too and
are already supported, which is why they are not listed.

## Current Limitations

- The one-line rationale under each front is written here and nowhere else. It is
  the part of this page most likely to drift from the use-case pages it summarizes.
- Universal search, contacting a restaurant, and the BiteTrail ecosystem have no
  owning epic, so those use cases cannot be traced to issues yet.
- This page covers unbuilt work only. Use cases under "Supported today" in
  [SSOT](../README.md) are not grouped here.

## Related Pages

- [Mission](../product/mission.md)
- [Principles](../product/principles.md)
- [Monetization](../product/monetization.md)
- [Current State - Roadmap](roadmap.md)
- [SSOT](../README.md)
- [Traceability Map](../overview/traceability-map.md)

## Sources Used

- Use Cases section in [SSOT](../README.md)
- Epics section in [SSOT](../README.md)
- [Mission](../product/mission.md)

[#738]: https://github.com/muhammedgaygisiz/travellers-apps/issues/738
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1122
[#1123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1123
[#1124]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1124
[#1125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1125
[#1487]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1487
[#1495]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1495
[#1630]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1630
[#1723]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1723
