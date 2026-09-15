# UC - Complete Universal Search

## Status

**Level:** L0.
Not built, and stays at L0 until it is (`UF-2`). Search ships today and is described by
[UC - Search In BiteTribe](uc-search-in-bitetribe.md); this page is the fuzzy, typo-tolerant search across more entity
kinds that the still-open epic [#790] asks for. **Whether it replaces the search that ships or extends it is not
decided**, so neither page claims the other's behaviour.

## Goal

Someone who half-remembers a name, misspells it, or does not know which kind of thing they are
looking for still finds it - across accounts, Bites, restaurants, menus and curated journeys.
This page owns the matching behaviour that does not exist yet; what search does today is
[UC - Search In BiteTribe](uc-search-in-bitetribe.md)'s.

## Actors

- **Bite Creator** - would search once, in one place, without choosing a category first or
  spelling the target correctly. A provisional reading: nothing here is built, so no actor has
  exercised it (`UF-4`, row 3).

## Flow

- User searches in a Google-like way.
- Search supports fuzzy matching and typo tolerance.
- User can scope search categories and find richer searchable fields.

## MVP Classification

**[Secondary]** - the whole page. Search across accounts, Bites and restaurants already ships
and is `[MVP]` on [UC - Search In BiteTribe](uc-search-in-bitetribe.md); this is that search made forgiving, which the
initial release does not require.

## App Store Review Area

Not relevant, because nothing here is built and nothing proposed introduces a permission or a
declared data type. Revisit if universal search reaches entities that are not already public to
a signed-in account.

## Related GitHub Scope

- Part of [#790], _epic: user wants to search in the app_ - the open epic this page belongs to,
  and the only issue named here that is not closed.
- Issue [#843] is **not** this page's. It is the closed epic that delivered the search which
  ships today, described by [UC - Search In BiteTribe](uc-search-in-bitetribe.md).

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)
- [Restaurant](../domain/restaurant.md)
- [Bite Trail](../domain/bite-trail.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover, the traveler and
  the Bite creator
- [UC - Search In BiteTribe](uc-search-in-bitetribe.md) - what search does today, and the boundary this page has not yet
  settled with it

[#790]: https://github.com/muhammedgaygisiz/travellers-apps/issues/790
[#843]: https://github.com/muhammedgaygisiz/travellers-apps/issues/843
