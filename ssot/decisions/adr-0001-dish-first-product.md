# ADR-0001 Dish First Product

## Status

Accepted.

## Context

BiteTribe exists to help people decide what to eat.

Traditional food discovery products often start from restaurants, ratings, or directories. BiteTribe starts from the actual dish someone ate, then uses restaurant, location, creator, menu, price, review, and journey context to make that dish understandable.

The core product question is:

> What should I eat?

not only:

> Which restaurant should I visit?

## Decision

BiteTribe is a dish-first product.

The Bite is the smallest meaningful product unit and the central entity of the platform.

Restaurants, menus, profiles, maps, bucket lists, BiteTrails, marketplace features, and business tools should support the discovery, creation, trust, and actionability of Bites.

## Consequences

- Bite creation and discovery remain central product loops.
- Restaurant and menu features are valuable when they help users understand or act on a Bite.
- Business tools should support authentic food experiences instead of becoming generic advertising inventory.
- Search, feed, map, profile, restaurant, and BiteTrail journeys should keep Bites visible as first-class results.
- Data quality work should prioritize Bite usefulness: image, dish name, place context, location, price, creator, and trust signals.

## Non-Goals

- BiteTribe is not primarily a restaurant directory.
- BiteTribe is not primarily a generic review platform.
- Restaurant pages should not displace the Bite as the product center.

## Links

- [[Mission]]
- [[Bite]]
- Use Cases section in [[SSOT]]
- Epics section in [[SSOT]]
