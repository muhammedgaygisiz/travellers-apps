# Current State - Product Direction

## Purpose

Product Direction names the fronts the product grows along, and groups the
"Next to implement" use cases from [[SSOT]] under them.

It sits between [[Mission]] and [[Current State - Roadmap]]. Mission says what
BiteTribe does and where it stops. This page says which parts of the product get
better next and why each front matters. The Roadmap owns sequencing, dates, and
launch status; nothing here carries a date.

## Why It Exists

Product Direction should help answer:

> Which front does this piece of work belong to, and what else belongs with it?

The use-case list in [[SSOT]] is flat. Grouping it makes the shape of the unbuilt
product visible, and makes a use case that fits no front obvious instead of
silently orphaned.

## How To Use This Page

- Every use case under "Next to implement" in [[SSOT]] should appear here exactly once.
- When a use case ships, move it in [[SSOT]] and drop it from the front here.
- When a front has no remaining use cases, remove the front.
- A new use case that fits no existing front means either a missing front or a
  use case that needs re-scoping. Do not add it to the nearest front to make the
  list tidy.
- Epics are listed where one owns the use case. A missing epic link is a real
  gap, not a formatting omission.

## Search That Scales With The Content Graph

- [[UC - Complete Universal Search]]

People, bites, restaurants, menus, and curated journeys have to stay findable as
the graph grows, or discovery degrades exactly when there is most to find.

No epic owns this front yet.

## Restaurant And Menu Completeness

- [[UC - Finish Restaurant Profile And Menu Completeness]]
- [[UC - Expand Restaurant Menus Into Actionable Menu Journeys]]
- [[UC - Own And Claim Restaurants]] — [[epic-1069]]

Restaurant and menu data should carry someone from discovery to a clear next
action: trying a dish, planning a visit, or creating a bite from a menu item.

## The BiteTrail Ecosystem

- [[UC - Mature BiteTrail Marketplace Packages]]
- [[UC - Add BiteTrail Gamification]]

Curated journeys turn discovery into intent and progress, and are how creators
eventually earn from local knowledge. See [[Bite Trail]] and [[Market Place]].

No epic owns this front yet.

## Table Service In The Restaurant

- [[UC - Configure Restaurant Floor Plans And Tables]] — [[epic-1070]]
- [[UC - Manage Tables During Service]] — [[epic-1071]]
- [[UC - Order At The Table Through A QR Code]] — [[epic-1072]]

The in-restaurant half of [[epic-735]]. It reaches the mission when an order
becomes a bite, which is [[epic-1073]]. Until then it is business tooling, and
[[Mission]] treats it as supporting work rather than the centre of the product.

## Monetization

- [[UC - Subscribe To BiteTribe Pro]] — [[epic-1124]]
- [[UC - See Ads As A Free User]] — [[epic-1123]]
- [[UC - Buy A Paid BiteTrail]] — [[epic-1125]]

[[Monetization]] owns the free and paid boundary and the revenue share. All three
sit behind the entitlement foundation in [[epic-1122]], under umbrella
[[epic-1121]].

## Trust And Data Quality

- [[UC - Harden Platform And Backend Trust]]
- [[UC - Strengthen Location Currency And Data Quality Guidance]]
- [[UC - Improve Localization Quality]] — [[epic-738]]

Data quality work is product work. Bad location, currency, or language context
weakens trust in every bite it touches.

## Current Limitations

- The one-line rationale under each front is written here and nowhere else. It is
  the part of this page most likely to drift from the use-case pages it summarizes.
- Search, menu completeness, and BiteTrail gamification have no owning epic, so
  those fronts cannot be traced to issues yet.
- This page covers unbuilt work only. Use cases under "Supported today" in
  [[SSOT]] are not grouped here.

## Related Pages

- [[Mission]]
- [[Principles]]
- [[Monetization]]
- [[Current State - Roadmap]]
- [[SSOT]]
- [[Traceability Map]]

## Sources Used

- Use Cases section in [[SSOT]]
- Epics section in [[SSOT]]
- [[Mission]]
