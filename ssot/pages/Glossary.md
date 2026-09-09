# Glossary

## Purpose

Glossary fixes the business language of BiteTribe. Each term has a definition and
the reason the business cares about it.

It is the naming authority for product, domain, use-case, and epic pages. When a
term here has an owning domain page, that page holds the rules and this page holds
the meaning.

## Why It Exists

Glossary should help answer:

> What does this word mean here, and why does it matter?

Terms drift when the same concept is named differently across pages, issues, and
code. If a change introduces a concept that is not on this page, either it has an
existing name already or the term belongs here.

## Product And Content

- **BiteTribe** — Community-driven food discovery product focused on real dishes people ate, not only restaurants they visited.
  - Business relevance: Core product and brand. The promise is authentic food discovery through user-generated bite experiences.
- **Bite** — A shared food experience for a specific dish, including context such as photo, description, star rating, price, place, restaurant, and creator. See [[Bite]].
  - Business relevance: Primary content unit. More high-quality bites increase discovery value, engagement, and data quality.
- **Bite creator** — A user who creates and publishes bites. Both a persona and a role, and the two are not interchangeable: the persona in [[Personas]] describes the audience, the role in [[User Roles]] describes what the account may do. See [[User]].
  - Business relevance: Supply-side contributor. Creator motivation, trust, and retention directly affect content growth.
- **Review** — User-written opinion or evaluation attached to a bite.
  - Business relevance: Adds qualitative trust and helps other users decide whether a dish is worth trying.
- **Like** — A persisted reaction to a Bite: one per user and Bite, chosen from a small set of emoji, where choosing another replaces the previous one. **Also written _Reaction_, and both wordings are permitted until the naming is decided** — the app's own onboarding copy already says "reactions" while the model and its counters say `likes`. See [[Current State - Open Questions]].
  - Business relevance: Engagement signal that can support ranking, recommendations, and creator feedback.
- **Star** — The rating a Bite creator gives the dish, shown as stars on the Bite and on Bite detail. Optional. Distinct from a BiteTrail rating, which rates a curated trail rather than a dish. See [[Bite]].
  - Business relevance: The one comparable quality signal a Bite carries. Everything else on a Bite is description, price or place, none of which ranks.
- **Content quality** — Usefulness, authenticity, completeness, and trustworthiness of bites and related profile data.
  - Business relevance: Determines whether discovery feels reliable enough for users and businesses.

## Discovery

- **Food discovery** — The process of finding what to eat based on real experiences, location, taste, price, and social proof.
  - Business relevance: Main user value proposition. BiteTribe should help people decide what to eat faster and with more confidence.
- **Search** — Capability to find users, bites, restaurants, or other food content by text and filters.
  - Business relevance: Essential discovery mechanism once content volume grows.
- **Location-based discovery** — Discovery experience using the user's location or a selected place to find nearby bites and restaurants.
  - Business relevance: Core travel and local-use scenario. Location quality affects trust and relevance.
- **Currency** — Monetary unit used for bite prices.
  - Business relevance: Supports international usage and price comparability across travel contexts.
- **Local food culture** — The patterns, dishes, places, and stories that represent what people actually eat in a location.
  - Business relevance: Long-term strategic differentiator for BiteTribe compared with generic restaurant directories.

## Profiles And Community

- **Public profile** — User profile visible to other users, including selected identity and activity information. See [[User]].
  - Business relevance: Supports trust, social discovery, creator identity, and community-building.
- **Private profile** — User profile with restricted public visibility.
  - Business relevance: Privacy option that keeps participation accessible for users who do not want a public creator identity.
- **Leaderboard** — Ranked list of users, usually based on contribution volume such as bite count.
  - Business relevance: Gamification surface that can motivate creators and highlight active community members.
- **Bucket list** — Personal saved list of bites or food experiences a user wants to remember or try later. See [[Bucket List]].
  - Business relevance: Retention feature that turns discovery into intent and future engagement.

## Restaurants And Menus

- **Place** — Where a Bite was eaten, carried on every Bite as a human-readable name. A place is not a record of its own: it is either unmatched, or it has become a restaurant candidate, or it has been verified into a restaurant. See [[Bite]].
  - Business relevance: Every Bite has a place and only a few places ever become restaurants. Keeping the two apart is what lets the product carry thousands of Bites without thousands of restaurant pages, and it is why a Bite is complete even where no restaurant exists.
- **Restaurant** — A verified or managed place: the record that groups business information, location, menu-related content, and the bites connected to that place. _Restaurant profile_ is retired as a domain term — the public restaurant page is a surface, not a second concept. See [[Restaurant]].
  - Business relevance: Anchor for business-side value, discovery, and potential monetization.
- **Menu item** — A dish or product offered by a restaurant.
  - Business relevance: Connects business inventory to user-generated bite content and can support conversion flows such as creating a bite from a menu item.
- **Restaurant claim** — The step before ownership: settling who should own a restaurant that has none. **Not a record in the product.** The self-service claim was declined (\#1076) and the `RestaurantClaim` model removed with it (\#1077), so a claim is settled off-system, on the call the operator is already having, and reaches BiteTribe only as the operator's assignment and its stated reason. See [[UC - Own And Claim Restaurants]].
  - Business relevance: A restaurant with no owner has nobody accountable for its data, and a claim is how that gap closes. Where it is settled decides how much evidence anyone can point to afterwards.
- **Restaurant ownership** — The state a claim leads to: one account, holding the business role, is accountable for one restaurant's data. An operator assigns it with a stated reason and can revoke it; `claimStatus` is `unclaimed`, `claimed` or `revoked`. A restaurant is assigned, never self-requested. See [[UC - Own And Claim Restaurants]].
  - Business relevance: Every operational restaurant capability depends on ownership. Assignment is recorded by \#1077 and enforced by the Firestore rules of \#1078, so it names who may write; nothing reads it in the UI yet (\#1079), so the business dashboard still lists restaurants the account cannot write.
- **Restaurant candidate** — A proposed restaurant, assembled from repeated bites at one place and held for a BiteTribe operator to verify, dismiss, or resolve against a restaurant that already exists. Produced two ways: automatically, once five nearby bites within 200 m name the same place, or on demand by an operator from a single bite. See [[UC - Detect Restaurant Candidate]] and [[UC - Verify Restaurant Candidate]].
  - Business relevance: The only route by which a restaurant comes into existence, so it governs both how fast the restaurant side of the product can grow and how much of it is trustworthy. A wrong verification publishes a page about a real business that was never involved.
- **Candidate producer** — Which of those two routes created a candidate, recorded on the candidate itself. The automatic route carries evidence from five independent bites; the operator route carries none by design, because a deliberate operator action is its own safeguard.
  - Business relevance: The two routes hold different standards of evidence, so the producer is what makes the collection's quality claim checkable rather than assumed.

## Table Service

- **Floor plan** — A restaurant's structured two-dimensional representation of its dining area, made of rooms, tables, and geometry objects stored as data rather than as an image. See [[Floor Plan]].
  - Business relevance: Turns the physical restaurant into something BiteTribe can address, which is the foundation for table QR codes, occupancy, and ordering.
- **Room** — A named area of a restaurant with physical dimensions, containing tables and geometry such as walls, doors, and counters.
  - Business relevance: Lets restaurants with several dining areas, floors, or terraces represent all of them.
- **Table** — A seating place in a restaurant, modelled as a business entity with a public number, a capacity, a position, and a QR token. See [[Table]].
  - Business relevance: The unit that connects the physical restaurant to visits, orders, payments, and eventually Bites.
- **Table state** — The live operational status of a table, such as available, reserved, occupied, ordering, awaiting payment, cleaning, or disabled, stored separately from the floor plan.
  - Business relevance: Lets staff run service from the same plan the owner configured, without operational updates rewriting the layout.
- **Table visit** — A party at a table over a period of time, owning the orders placed and the payment made during it. See [[Table Visit]].
  - Business relevance: Attaching orders to a visit rather than to a table lets a party move tables and still keeps a complete record for receipts and Bite creation.
- **Table QR token** — An opaque, non-guessable identifier printed as a QR code on a table, resolving to a restaurant, room, and table.
  - Business relevance: The guest's entry point into table ordering. It identifies a table context and never proves physical presence.
- **Table ordering** — A guest scanning a table QR code, browsing the restaurant's menu, and placing an order from the table.
  - Business relevance: Extends BiteTribe from food discovery into restaurant interaction, and produces the best-sourced Bites the product can get.

## Curation And Marketplace

- **BiteTrail** — Curated package or route of bites that can be offered by a creator, food vlogger, or business user. See [[Bite Trail]].
  - Business relevance: Marketplace concept for packaging local food knowledge into a product-like experience.
- **Marketplace** — Product area where curated food experiences such as BiteTrails can be discovered, claimed, purchased, or consumed. See [[Market Place]].
  - Business relevance: Potential monetization surface for BiteTribe and for external food creators.

## Monetization

See [[Monetization]] for the free and paid boundary and the revenue share.

- **Free tier** — The unpaid BiteTribe experience, covering the 15 km radius around the user's current position with client-side search and filtering inside that result set, plus unrestricted creation, social and bucket-list capability.
  - Business relevance: The product's give-away. It is deliberately the whole discovery loop within reach, so the paid tier sells range rather than function.
- **BiteTribe Pro** — The paid subscription tier that unlocks backend search, loading Bites at a position or city other than the current one, a radius beyond 15 km, and an ad-free app. See [[Subscription]].
  - Business relevance: The main recurring revenue channel. It prices reach beyond the user's surroundings, which is also where backend cost is incurred.
- **Entitlement** — The server-owned record of what a user's account is currently allowed to do, written only by the backend and carried to the client as an auth custom claim.
  - Business relevance: Makes the paywall real. Without a server-owned entitlement, every gate is a suggestion the client can decline.
- **Paid BiteTrail** — A BiteTrail with a price above zero, sold through store in-app purchase, whose Bites stay locked until a purchase is verified.
  - Business relevance: Turns curated local knowledge into a sellable product and is the mechanism by which creators earn from BiteTribe.
- **Net proceeds** — The amount remaining from a sale after the app store's commission. The creator's 80 percent share of a paid BiteTrail is calculated on this figure, never on the gross sale price.
  - Business relevance: Prevents a revenue-share promise that cannot be honoured. Eighty percent of gross plus a store commission exceeds the sale price.

## Platform

- **App Check** — Firebase protection mechanism that helps verify backend requests come from legitimate app instances.
  - Business relevance: Reduces fraud and protects backend cost, data, and service quality.

## Current Limitations

- The groupings on this page are an organising aid, not a domain boundary. The
  authoritative model is the Domain section of [[SSOT]].
- Terms with an owning domain page are linked; the rest exist only here. A term
  that grows rules rather than just a meaning should get its own page.
- **A term here is human-readable; a code identifier is an attribute of it, not a rival
  name.** `RestaurantCandidate`, `Bucketlist` and `bucketlistId` are spellings of
  _Restaurant candidate_ and _Bucket list_, not competing terms, so a difference in case
  or spacing between this page and the code is not drift. See `RD-GL-4`.

## Related Pages

- [[Mission]]
- [[Principles]]
- [[Personas]]
- [[Monetization]]
- [[SSOT]]

## Sources Used

- [[Vision]]
- [[Mission]]
- Domain section in [[SSOT]]
