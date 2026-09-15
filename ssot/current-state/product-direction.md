# Current State - Product Direction

## Purpose

Product Direction names the fronts the product grows along, and groups the
"Next to implement" use cases from [SSOT](../README.md) under them.

It sits between [Mission](../product/mission.md) and [Current State - Roadmap](roadmap.md). Mission says what
BiteTribe does and where it stops. This page says which parts of the product get
better next and why each front matters. The Roadmap owns sequencing, dates, and
launch status; nothing here carries a date.

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
- [UC - Own And Claim Restaurants](../use-cases/uc-own-and-claim-restaurants.md) — [epic-1069](../github/epic-1069.md)

Restaurant and menu data should carry someone from discovery to a clear next
action: trying a dish, planning a visit, or creating a bite from a menu item.

## The BiteTrail Ecosystem

- [UC - Price A BiteTrail For Sale](../use-cases/uc-price-a-bitetrail-for-sale.md)
- [UC - Add BiteTrail Gamification](../use-cases/uc-add-bitetrail-gamification.md)

Curated journeys turn discovery into intent and progress, and are how creators
eventually earn from local knowledge. See [Bite Trail](../domain/bite-trail.md) and [Market Place](../domain/market-place.md).

No epic owns this front yet.

## Table Service In The Restaurant

- [UC - Configure Restaurant Floor Plans And Tables](../use-cases/uc-configure-restaurant-floor-plans-and-tables.md) — [epic-1070](../github/epic-1070.md)
- [UC - Manage Tables During Service](../use-cases/uc-manage-tables-during-service.md) — [epic-1071](../github/epic-1071.md)
- [UC - Order At The Table Through A QR Code](../use-cases/uc-order-at-the-table-through-a-qr-code.md) — [epic-1072](../github/epic-1072.md)

The in-restaurant half of [epic-735](../github/epic-735.md). It reaches the mission when an order
becomes a bite, which is [epic-1073](../github/epic-1073.md). Until then it is business tooling, and
[Mission](../product/mission.md) treats it as supporting work rather than the centre of the product.

## Monetization

- [UC - Subscribe To BiteTribe Pro](../use-cases/uc-subscribe-to-bitetribe-pro.md) — [epic-1124](../github/epic-1124.md)
- [UC - See Ads As A Free User](../use-cases/uc-see-ads-as-a-free-user.md) — [epic-1123](../github/epic-1123.md)
- [UC - Buy A Paid BiteTrail](../use-cases/uc-buy-a-paid-bitetrail.md) — [epic-1125](../github/epic-1125.md)

[Monetization](../product/monetization.md) owns the free and paid boundary and the revenue share. All three
sit behind the entitlement foundation in [epic-1122](../github/epic-1122.md), under umbrella
[epic-1121](../github/epic-1121.md).

## Trust And Data Quality

- [UC - Harden Platform And Backend Trust](../use-cases/uc-harden-platform-and-backend-trust.md)
- [UC - Strengthen Location Currency And Data Quality Guidance](../use-cases/uc-strengthen-location-currency-and-data-quality-guidance.md)
- [UC - Improve Localization Quality](../use-cases/uc-improve-localization-quality.md) — [epic-738](../github/epic-738.md)

Data quality work is product work. Bad location, currency, or language context
weakens trust in every bite it touches.

## Current Limitations

- The one-line rationale under each front is written here and nowhere else. It is
  the part of this page most likely to drift from the use-case pages it summarizes.
- Search, menu completeness, and BiteTrail gamification have no owning epic, so
  those fronts cannot be traced to issues yet.
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
