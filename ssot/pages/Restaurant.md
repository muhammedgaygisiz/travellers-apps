# Restaurant

## Purpose

A Restaurant represents a verified or managed place context around Bites.

Restaurants are not the primary content unit of BiteTribe. They exist to make Bites easier to understand, group, discover, and act on.

## Why It Exists

The goal of a Restaurant is to help users answer:

> Where can I get this Bite, and what else can I understand about this place?

Restaurant context should support dish-first discovery rather than becoming a generic restaurant directory.

## Business Rules

- A Restaurant can contain many Bites.
- A Bite can optionally link to a verified Restaurant through `restaurantId`.
- A Bite can still have a `place` string when no verified Restaurant exists.
- A Restaurant can have one menu.
- A Restaurant can have an address and GPS position.
- A Restaurant can have social media links, opening hours, description, and image.
- Creating a Restaurant can update selected Bites with the new `restaurantId`.
- Verifying a Restaurant candidate creates the Restaurant through the backend, creates its initial Menu from the candidate Bites, updates all candidate Bites with the new `restaurantId`, and records the verification on the candidate. The full flow, its rules and its failure modes are in [[UC - Verify Restaurant Candidate]].
- The initial Menu is a draft built from evidence, not a claim about the real menu: one item per distinct Bite dish name, priced with the average of the prices users reported, in a single `Bites` category the business user edits afterwards.
- Candidate-backed Restaurant creation should be idempotent: repeated verification of an already verified or merged candidate must return the existing verified Restaurant instead of creating another one.
- Verified versus unverified restaurant behavior is an active product area.
- A Restaurant records an owner and a claim state. `ownerUserId` and `claimStatus` exist on the model as of issue \#1074 and are written by an operator as of issue \#1077; a missing `claimStatus` means `unclaimed`. Ownership, assignment, and authorization are specified in [[UC - Own And Claim Restaurants]] and are the prerequisite for every operational restaurant capability.
- Ownership is held by a normal user carrying an additional business role. There is no organisation entity; see [[issue-1371]].
- **Ownership is assigned by an operator, never requested by a restaurant.** Verification happens off-system, on the call the operator is already having, so there is no claim document, no queue and no contested state. Issue \#1076 is closed as not planned.
- A Restaurant has at most one owner. Assigning a Restaurant that already has one is refused and the refusal names the current owner; reassignment is revoke then assign, so the operator log carries two decisions with two reasons.
- Assigning is idempotent: repeating the same assignment returns the current state instead of writing a second grant, matching the `verifyRestaurantCandidate` rule below.
- An assignment target has to hold the `business` role. An owner without it would be named on a restaurant they cannot open, because every business-app route is gated on the role.
- Revoking deletes `ownerUserId`, `claimedAt` and `claimedAtTimestamp` and sets `claimStatus: revoked`. Revoking a Restaurant nobody holds is refused rather than writing `revoked` over `unclaimed`, because "it was taken away" and "nobody ever held it" are different answers.
- Both operator actions require a reason. Cloud Logging is the only record an ownership change leaves; see [[Implementation - Firebase Functions]].
- Ownership grants maintenance rights only. Nothing moves when it changes: the Restaurant's Bites, menu and profile are untouched.
- **A Restaurant has staff, and the account holding it decides who they are.** Staff turns over with ordinary hiring, so it is not an operator decision (issue \#1537). An owner adds and removes staff on the Restaurants it holds and on no others; an operator can do the same on any Restaurant, which is the way back when a Restaurant locks itself out.
- The staff record lives outside the Restaurant, one document per staff account naming its Restaurant. An account is staff at one Restaurant at a time, and being staff means holding the `staff` role and that record together — neither exists without the other. See [[User Roles]] and [[Architecture - Auth]].
- An account holding `admin` or `business` cannot be made staff, and cannot have a role taken from it through the staff surface. Staff is the narrowed set, so an account that already holds a wider one is not a staff account.
- A Restaurant will be able to have one Floor Plan, containing Rooms and Tables. See [[Floor Plan]] and [[Table]].
- Restaurant tags are derived from the Bites at the place and are not stored on the Restaurant. Bites keep tags exactly as they were typed, so the derived list compares them with a leading `#` stripped and case folded, shows the first spelling that survives that folding, and never shows the `#`. See issue \#1389 and [[issue-1389]].

## Required Data

Current model fields:

| Field         | Current name in code | Description                   |
| ------------- | -------------------- | ----------------------------- |
| Restaurant id | `id`                 | Unique restaurant identifier. |
| Name          | `name`               | Restaurant or place name.     |
| Position      | `position`           | GPS position.                 |

## Optional Data

- `distance`
- `image`
- `imagePath`
- `address`
- `menuId`
- `unsaved`
- `restaurantCandidateId`
- `biteIds`
- `bites`
- `ownerUserId`
- `claimStatus`
- `claimedAt`
- `claimedAtTimestamp`
- `socialMediaLinks`
- `description`
- `openingHours`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`

Future or expanding data:

- verification status
- floor plan rooms and tables (issue \#1080)
- table-ordering enablement flag (issue \#1100)
- derived tags from Bites
- aggregate rating and rating count
- menu-item-to-Bite links
- availability or reservation metadata

## Relationships

```text
Restaurant
|-- Bites
|-- Menu
|-- Address
|-- Location
|-- Social Links
|-- Owner or business maintainer (future/expanding)
|-- Floor Plan (planned)
    |-- Rooms
        |-- Tables
            |-- Table Visits
                |-- Orders
```

## Lifecycle

```text
Place appears through Bite context
|
Restaurant candidate or business-created restaurant
|
Restaurant saved
|
Menu created (seeded from Bite evidence for verified candidates)
|
Bites linked through restaurantId
|
Profile enriched with image, address, opening hours, links, and description
|
Visible in Bite, restaurant, menu, search, and business flows
```

Current implementation notes:

- Restaurants are stored in `/restaurants/{restaurantId}`.
- Creating a restaurant also creates a menu document and stores the `menuId` on the restaurant. The business app create path writes an empty menu; candidate verification writes the initial menu derived from the candidate Bites.
- If `biteIds` are provided during creation, those Bites are updated with the new `restaurantId`.
- Candidate-backed creation uses `verifyRestaurantCandidate` so restaurant creation, menu creation, Bite linking, and candidate status changes happen in one backend transaction.
- Candidate verification stores `verifiedRestaurantId`, `verifiedAt`, `verifiedAtTimestamp`, and `verifiedByUserId` on `/restaurantCandidates/{candidateId}`.
- Restaurant image upload stores an `imagePath`.
- Ownership is assigned and revoked through `assignRestaurantOwner` and `revokeRestaurantOwner`, both admin-only, both transactional, and both logging through `logOperatorAction`. The operator surface is `restaurant-ownership` in the admin app, which reuses the account list issue \#1476 built rather than adding a second way to find an account.
- Staff is `addRestaurantStaff`, `removeRestaurantStaff` and `listRestaurantStaff`, admitting `business` or `admin` and then reading `ownerUserId` to decide which Restaurant the caller reaches. They write `/restaurantStaff/{uid}` and the `staff` claim together, and log through `logOperatorAction` like the ownership pair. The surfaces are `restaurant/:restaurantId/staff` in the business app and the staff card on `restaurant-ownership` in the admin app.
- The assignment is a Firestore document field, never a custom claim. It then takes effect immediately rather than after up to an hour of token lifetime, there is no 1000-byte claim payload to grow into, and issue \#1078's rules read documents anyway — a claim copy would be a second version of one fact that can disagree with it.

## Permissions

- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - View restaurant and place context through Bite flows.
  - Browse restaurant Bites and menu pages.
- Business user or admin
  - Create Restaurant.
  - Edit Restaurant.
  - Maintain image, address, position, opening hours, social links, description, and menu.
- Business user, on a Restaurant it holds
  - Add and remove the staff on that Restaurant.
- Admin
  - Assign a verified Restaurant to a business account, and revoke that assignment.
  - Add and remove the staff on any Restaurant, held or not.
  - Verification and moderation are otherwise future or operational capabilities, not fully modeled as permissions today.

## Use Cases

Supported today:

- Open verified Restaurant from Bite.
- Open unverified place from Bite.
- View all Bites of a Restaurant.
- View Restaurant menu.
- Search Restaurants.
- Create Restaurant in business app.
- Verify Restaurant candidate in admin app.
- Assign and revoke Restaurant ownership in admin app.
- Edit Restaurant in business app.
- Maintain address, position, social links, opening hours, description, image, and menu.

Related future or expanding use cases:

- Distinguish verified and unverified Restaurants more clearly.
- Suggest verified Restaurant candidates from nearby/fuzzy Bites.
- Link menu items to Bites.
- Show Restaurant tags derived from Bites.
- Support availability, reservation, contact, or visit planning from menu items.
- [[UC - Own And Claim Restaurants]]
- [[UC - Configure Restaurant Floor Plans And Tables]]
- [[UC - Manage Tables During Service]]
- [[UC - Order At The Table Through A QR Code]]

## Related Epics

- Restaurant menu
- Menu items linked to Bites
- Search
- BiteTrail packages
- Issue \#735 - Restaurant Interaction Platform, the umbrella for ownership, floor plans, table management, QR ordering, and Bites from orders

## Technical Implementation

Firestore:

```text
/restaurants/{restaurantId}
/menus/{menuId}
/bites/{biteId}
/restaurantCandidates/{candidateId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/restaurant.ts
libs/bite-tribe-common/model/src/lib/menu.ts
libs/bite-tribe/api/src/lib/restaurant-api/restaurant-api.service.ts
libs/bite-tribe/api/src/lib/menu-api/menu-api.service.ts
libs/bite-tribe/restaurant/page
libs/bite-tribe/menu/page
libs/bite-tribe-admin/restaurants/page
libs/bite-tribe-admin/restaurants/data-access
libs/bite-tribe-business/restaurant/page
libs/bite-tribe-business/edit-menu/page
```

Cloud Functions:

```text
searchRestaurants
verifyRestaurantCandidate
assignRestaurantOwner
revokeRestaurantOwner
```

Storage:

```text
images/restaurants/{restaurantId}/{filename}
```

## Current Limitations

- **Ownership is written and enforced, and not yet visible.** An operator assigns and revokes a Restaurant as of issue \#1077, and issue \#1078 made `apps/bite-tribe-firebase/firestore.rules` read `ownerUserId`: a Restaurant, its Menu and its Bite trails are writable by the account named on the document and by an Operator, and by nobody else. The four ownership fields themselves are writable by no client at all, so an assignment can only be made through the callables. Two things are still true: the rules deploy by hand, so they bind production only after `npx nx firebase-deploy-rules bite-tribe-firebase` has run, and nothing _reads_ the field in the UI — scoping the business dashboard to the assigned restaurants is issue \#1079, so an account can still open the edit form for a Restaurant it does not hold and is refused on save. See [[UC - Own And Claim Restaurants]].
- The `RestaurantClaim` model was removed with issue \#1077. It was added in \#1074 for the self-service claim flow of \#1076, never had an importer, and direct assignment produces no claim document. `RestaurantClaimStatus` lost `pending` and `disputed` with it: both existed only because of the review queue.
- `MenuItem` has no stable identifier. Items are array entries inside `Menu.categories[]`, addressable only by name and index, so nothing can safely reference a menu item over time. See issue \#1099.
- Verified versus unverified Restaurant rules are still evolving.
- A Bite can use `place` without a `restaurantId`, so restaurant matching can be fuzzy or incomplete.
- Candidate verification currently relies on a business-user workflow and callable auth; explicit role-based authorization is not fully modeled here.
- Menu item actions are not yet connected to Bite creation, reservation, or contact flows.
- Aggregate rating/tag behavior is derived from Bites and not fully formalized in the Restaurant model. Tag deduplication is a display concern in `libs/bite-tribe/restaurant/page`, folding only the `#` prefix and case; near-duplicates such as `asian food` and `asianfood` still show twice, and search and tag suggestions still read the raw stored strings.

## Future Ideas

- Restaurant verification workflow.
- Restaurant candidate detection from nearby Bites.
- Menu item to Bite creation.
- Restaurant tags from Bites.
- Availability and reservation flows.
- Better Restaurant data quality checks.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
- [[Bite]]
