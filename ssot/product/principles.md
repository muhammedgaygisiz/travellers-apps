# Principles

## Purpose

Principles are the decision rules for individual changes. They turn [[Vision]] and
[[Mission]] into a test that can be applied to one pull request, one feature, or
one design choice.

Mission says what BiteTribe does and where it stops. Principles say how to choose
between two ways of doing it.

## Why It Exists

Principles should help answer:

> This change is in scope. Is it the right version of the change?

They are evaluative and timeless: they apply to work someone has already proposed,
and they should read the same after the current roadmap is finished. What to build
next is [[Current State - Product Direction]]; when is [[Current State - Roadmap]].

## The Principles

- **The bite is the center.**
  - Every major product decision should strengthen the usefulness, quality, discovery, or creation of bites. See [[Bite]] and [[ADR-0001 Dish First Product]].
  - Restaurants, menus, profiles, maps, BiteTrails, and marketplace features are supporting context around real food experiences.
- **Show what people actually ate.**
  - BiteTribe should favor concrete dish-level experiences over generic restaurant claims.
  - A useful bite answers what was eaten, where it was eaten, who shared it, what it cost, and why it matters.
- **Authenticity beats polish.**
  - Real photos, real opinions, and lived context are more valuable than marketing-style presentation.
  - The product should make authentic contributions easy without making them feel artificial.
- **Discovery should lead to confidence.**
  - Users should leave a discovery flow with a clearer decision about what to eat.
  - Feed, map, search, restaurant pages, menu pages, profiles, and BiteTrails should reduce uncertainty instead of adding browsing noise.
- **Local context matters.**
  - Location, currency, restaurant and place data, menu details, language, and creator identity should make a bite understandable in its real-world context.
  - Data quality work is product work because bad context weakens trust.
- **Community creates trust.**
  - Profiles, followers, likes, reviews, leaderboards, and creator history should help users judge whether a recommendation is relevant. See [[User]].
  - Social features should support food discovery, not distract from it.
- **Curation turns discovery into journeys.**
  - [[Bucket List]] and [[Bite Trail]] should help users move from interesting bites to planned food experiences.
  - Curated journeys should feel useful for locals, travelers, food creators, and organisations.
- **Businesses support the experience, not the other way around.**
  - Business tools should help restaurants, organisations, and creators contribute better food context. See [[Restaurant]].
  - [[Market Place]] and organisation features should preserve the authentic bite-first discovery loop. See [[Monetization]] for the free and paid boundary.
- **Search must scale with content.**
  - As the graph of bites, users, restaurants, menus, and BiteTrails grows, search must become fast, forgiving, and understandable.
  - Search categories, fuzzy matching, and richer searchable fields should help users find intent quickly.
- **Trust and safety are product foundations.**
  - App Check, backend callables, clean data ownership, profile privacy, account deletion, and quality controls protect the reliability of the food graph.
  - Platform hardening should be treated as part of delivering a trustworthy user experience.
- **International use is a first-class constraint.**
  - BiteTribe is built for travelers, locals, and food cultures across places.
  - Localization, currency handling, and location quality should be treated as core product concerns rather than afterthoughts.
- **Keep the system explainable.**
  - Users should understand why they see a bite, restaurant, creator, or BiteTrail.
  - Internal SSOT pages, epics, and use cases should stay aligned so product decisions can be traced back to the mission. See [[Traceability Map]].

## Decision Checks

- Does this make it easier to create, understand, find, or act on a bite?
- Does this increase trust in the food experience?
- Does this help users decide what to eat?
- Does this preserve authentic community value over generic listing behavior?
- Does this improve the usefulness of local context?
- Does this support creators, restaurants, or organisations without weakening the user experience?

## Related Pages

- [[Vision]]
- [[Mission]]
- [[Personas]]
- [[Glossary]]
- [[Monetization]]
- [[Current State - Product Direction]]
- [[ADR-0001 Dish First Product]]

## Sources Used

- [[Vision]]
- [[Mission]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- Epics section in [[SSOT]]
