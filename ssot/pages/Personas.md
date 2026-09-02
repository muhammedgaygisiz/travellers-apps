# Personas

## Purpose

Personas describe who BiteTribe is for, what each group is trying to do, and what
the product gives them today.

[[Mission]] names three audiences at a high level: food lovers, bite creators, and
restaurants and organisations. This page splits those into the seven concrete
groups the product actually has to serve, and records what each one can and cannot
do right now.

## Why It Exists

Personas should help answer:

> Who is this change for, and what do they already have?

A change that serves no persona on this page is either supporting work or a sign
that a persona is missing.

## Food lover

A person who wants to discover what to eat based on real experiences, not generic
restaurant listings.

**Goals**

- Find dishes that look worth trying.
- Understand taste, price, location, restaurant context, and social proof before deciding.
- Save interesting food experiences for later.

**Needs**

- Fast discovery through feed, map, search, restaurant pages, profiles, and BiteTrails.
- Trustworthy bite details with photo, review, price, place, creator, and engagement signals.
- Clear local context, including location and currency.

**Supported today**

- Browse bites in feed and map views.
- Open bite details, restaurant pages, menus, profiles, marketplace, BiteTrails, bucket lists, and leaderboard.
- Search for users, bites, and restaurants.

**Next opportunities**

- Better universal search, fuzzy matching, restaurant and menu completeness, stronger location and currency guidance, and richer BiteTrail journeys.

## Traveler

A food lover in an unfamiliar place who needs local food confidence quickly.

**Goals**

- Decide what to eat nearby or before arriving somewhere.
- Avoid tourist-trap or over-marketed restaurant choices.
- Understand local food culture through what people actually ate.

**Needs**

- Map-first discovery.
- Reliable place, currency, language, and menu context.
- Curated paths through local food, especially [[Bite Trail]] and [[Bucket List]].

**Supported today**

- Map views for bites, bucket lists, and BiteTrails.
- Restaurant and place pages, and menu entry points.
- Multilingual app assets and currency-related infrastructure.

**Next opportunities**

- Translation quality checks, stronger local context, travel-ready BiteTrails, and actionable menu journeys.

## Bite creator

A user who contributes food experiences and builds credibility through shared bites.

**Goals**

- Share what they ate in a way others can trust and use.
- Build a recognizable profile around food taste and local knowledge.
- Receive lightweight feedback and motivation.

**Needs**

- Low-friction bite creation and editing. See [[Bite]].
- Good image handling, restaurant and place selection, price and currency entry, tags, and review fields.
- Profile identity, followers, likes, reviews, and contribution recognition. See [[User]].

**Supported today**

- Create and edit bites.
- Upload and update images.
- Maintain profile information.
- Receive likes, reviews, follower interactions, notifications, and leaderboard visibility.

**Next opportunities**

- Onboarding assistant, better creator profile guidance, gamification, badges, and higher-quality bite creation prompts.

## Food curator or vlogger

A creator who packages local food knowledge into curated recommendations or journeys.

**Goals**

- Turn individual bite knowledge into a structured experience.
- Build trust and audience around curated local food expertise.
- Eventually monetize food journeys.

**Needs**

- BiteTrail creation and publishing. See [[Bite Trail]].
- Creator profile context.
- Marketplace visibility and clear ownership. See [[Market Place]].
- Metrics such as sold counters, ratings, and completion signals.

**Supported today**

- Marketplace and BiteTrail detail and map routes exist.
- Bucket lists and BiteTrails can support curated collections.
- Business app has a BiteTrail creation route.

**Next opportunities**

- Complete marketplace packages, free BiteTrail access, assigned-user workflows, sold counters, ratings, badges, and creator-facing BiteTrail management.
- Selling paid BiteTrails and earning 80 percent of net proceeds, with payout onboarding and an earnings dashboard. See [[Monetization]] and [[epic-1125]].

## Restaurant owner or business maintainer

A person responsible for keeping restaurant, menu, and business information useful
for discovery.

**Goals**

- Present accurate restaurant and menu context.
- Help users understand what dishes are available and worth trying.
- Benefit from authentic bite recommendations.

**Needs**

- Restaurant creation and editing. See [[Restaurant]].
- Menu editing and menu item management.
- Opening hours, social links, address and location pinning, about section, and verified restaurant state.
- A way to connect menu items to real bites.

**Supported today**

- Business app routes for dashboard, new restaurant, edit restaurant, and edit menu.
- Consumer app routes for restaurant pages, place pages, restaurant bites, and menu pages.

**Next opportunities**

- More complete restaurant profile maintenance, verified and unverified distinction, menu item states, menu-to-bite linking, reservation, contact and visit planning, and restaurant data-quality support.

## New user

A person who has just registered and does not yet understand how to participate well.

**Goals**

- Understand what BiteTribe is for.
- Set up identity, privacy, currency, and profile defaults.
- Create or discover the first useful bite quickly.

**Needs**

- Guided onboarding after registration.
- Clear explanation of public versus private profile value.
- Defaults that make discovery and creation feel local and relevant.

**Supported today**

- Start and auth flow, profile editing, settings, public and private profile concepts, and account flows exist.

**Next opportunities**

- Onboarding assistant for username, motivation, public profile, default currency, favorite currencies, and first actions. See [[epic-850]].

## Privacy-conscious participant

A user who wants the value of food discovery without unnecessary public exposure.

**Goals**

- Discover and save food experiences safely.
- Control profile visibility and account lifecycle.
- Participate without being forced into creator-like public identity.

**Needs**

- Clear public and private profile choices.
- Account deletion and privacy policy access.
- Trustworthy backend and platform protections.

**Supported today**

- Privacy policy, account deletion, profile editing, and App Check and backend hardening work are present.

**Next opportunities**

- Better onboarding around privacy choices, clearer profile visibility language, and continued trust and safety hardening.

## Persona Relationships

- Food lovers and travelers consume bites and create demand for trustworthy discovery.
- Bite creators supply authentic experiences that make discovery useful.
- Food curators turn groups of bites into journeys.
- Restaurant owners and business maintainers improve the context around places and menus.
- New users and privacy-conscious participants highlight where onboarding, defaults, and trust boundaries must be especially clear.

## Current Limitations

- "Supported today" and "Next opportunities" are point-in-time state. The
  authoritative lists are the Use Cases section in [[SSOT]] and, for unbuilt work,
  [[Current State - Product Direction]]. When those move, this page has to be
  updated by hand or it drifts.
- The seven personas here are a finer split of the three audiences in [[Mission]].
  Neither page states the mapping, so a new persona can be added here without
  Mission noticing.

## Related Pages

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- [[Monetization]]
- [[Current State - Product Direction]]
- [[Bite]]
- [[User]]
- [[Restaurant]]
- [[Bite Trail]]
- [[Bucket List]]
- [[Market Place]]

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- Epics section in [[SSOT]]
