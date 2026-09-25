# Journey - Floor Plan to Bite

**Provisional.** The journey layer is not part of the SSOT structure; see
[Journeys](README.md) for what that means and what is still undecided. This page is a
record of the flow as it stood on 19 September 2026, not a specification.

## Story

A restaurant owner draws their dining room, labels the tables and prints a code for
each one. During service, staff work that plan live and seat a party. The guest at that
table scans the code, reads the menu, orders, and asks for the bill. The dishes they
actually ordered then become the best-sourced Bites BiteTribe can produce - a verified
restaurant, a real dish, a checked price - needing only a photo, a rating and a comment.

The first three stages are shipped. The journey stops at "ask for the bill".

## Actors

Roles as [User Roles](../product/user-roles.md) defines them.

- **BiteTribe Operator** - assigns a restaurant to a business account. One step, at the
  very start.
- **Restaurant Owner** (`business`) - draws the plan, labels tables, prints codes, turns
  table ordering on.
- **Restaurant Staff** (`staff`) - works the live plan, seats parties, moves orders
  along, answers calls for the bill.
- **Guest** - scans and orders. Not a role: a member scanning a code acts as themselves,
  and a signed-out guest acts through an anonymous session, which `User Roles` lists
  under _Not roles_ as **Table Guest**.
- **The backend** - Cloud Functions, acting with admin credentials and no role. The
  actual writer in most steps.

## Stages

| #   | Stage                             | Owning use case                                                                                                    | What leaves this stage                                                                 | State                                   |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------- |
| 0   | Somebody owns the restaurant      | [UC - Own And Claim Restaurants](../use-cases/uc-own-and-claim-restaurants.md)                                     | A restaurant with an `ownerUserId`, which is what "active" means everywhere downstream | Shipped, epic [#1069]                   |
| 1   | The owner draws the room          | [UC - Configure Restaurant Floor Plans And Tables](../use-cases/uc-configure-restaurant-floor-plans-and-tables.md) | A published table, and an opaque token printed on a sticker in front of it             | Shipped, epic [#1070]                   |
| 2   | Staff work the floor              | [UC - Manage Tables During Service](../use-cases/uc-manage-tables-during-service.md)                               | An open visit at a seated table                                                        | Shipped, epic [#1071]                   |
| 3   | The guest scans, reads and orders | [UC - Order At The Table Through A QR Code](../use-cases/uc-order-at-the-table-through-a-qr-code.md)               | Orders under that visit, each carrying the price the guest was shown                   | Shipped; five issues open, epic [#1072] |
| 4   | The bill, and the Bite            | none yet                                                                                                           | A closed visit, a receipt, and a Bite prefilled from an order line                     | Not built, epic [#1073]                 |

Stage 3 also draws on [UC - View Restaurant Menus](../use-cases/uc-view-restaurant-menus.md)
for the published menu a guest reads without an account.

## The Sequence

One journey, numbered across every lane, as read from the code on 19 September 2026.

| #   | Lane     | Step                                                          | Surface                                                                                                                                                                                                                                                                                                                                                                                                          | Callable                     |
| --- | -------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 01  | Operator | Assigns the restaurant to a business account                  | the admin app                                                                                                                                                                                                                                                                                                                                                                                                    | `assignRestaurantOwner`      |
| 02  | Backend  | Rules scope every write to the owner                          | -                                                                                                                                                                                                                                                                                                                                                                                                                | `firestore.rules`            |
| 03  | Owner    | Lays out rooms, walls and tables in millimetres               | `/restaurant/:id/floor-plan` - [Floor Plan / Default](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Default.png), [Canvas / Metre Grid](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Canvas_Metre_Grid.png), [Canvas / Furnished](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Canvas_Furnished.png)                                                                             | -                            |
| 04  | Owner    | Gives each table a label, seats and an enabled state          | same - [Table Label Conflict](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Table_Label_Conflict.png), [Table Disabled](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Table_Disabled.png)                                                                                                                                                                                                    | -                            |
| 05  | Owner    | Validates and publishes the plan                              | same - [Validation Findings](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Validation_Findings.png), [Unpublished Changes](../../.loki/reference/chrome_laptop_Business_Floor_Plan_Unpublished_Changes.png)                                                                                                                                                                                            | -                            |
| 06  | Backend  | Issues an opaque token for every enabled table                | -                                                                                                                                                                                                                                                                                                                                                                                                                | `/tableTokens/{token}`       |
| 07  | Owner    | Prints QR sheets as table tents or a sticker grid             | `/restaurant/:id/floor-plan/qr-codes` - [Sticker Sheet](../../.loki/reference/chrome_laptop_Business_Table_QR_Sheets_Sticker_Sheet.png), [Table Tents](../../.loki/reference/chrome_laptop_Business_Table_QR_Sheets_Table_Tents.png), [Missing Code](../../.loki/reference/chrome_laptop_Business_Table_QR_Sheets_Missing_Code.png)                                                                              | -                            |
| 08  | Owner    | Turns table ordering on, and names the time zone              | `/restaurant/:id` - [Edit Restaurant / With Menu Only](../../.loki/reference/chrome_laptop_Business_Edit_Restaurant_With_Menu_Only.png)                                                                                                                                                                                                                                                                          | -                            |
| 09  | Staff    | Signs in and lands on the live room view                      | `/restaurant/:id/tables` - [Table Plan / Tablet](../../.loki/reference/chrome_laptop_Business_Table_Plan_Tablet.png), [Every Status](../../.loki/reference/chrome_laptop_Business_Table_Plan_Every_Status.png), [Offline](../../.loki/reference/chrome_laptop_Business_Table_Plan_Offline.png)                                                                                                                   | -                            |
| 10  | Staff    | Seats a party, which opens the visit                          | same - [Table Actions / Occupied](../../.loki/reference/chrome_laptop_Business_Table_Actions_Occupied.png)                                                                                                                                                                                                                                                                                                       | `transitionTableState`       |
| 11  | Staff    | Marks tables reserved, cleaning or disabled                   | same - [Reserved](../../.loki/reference/chrome_laptop_Business_Table_Actions_Reserved.png), [Cleaning](../../.loki/reference/chrome_laptop_Business_Table_Actions_Cleaning.png), [Disabled](../../.loki/reference/chrome_laptop_Business_Table_Actions_Disabled.png)                                                                                                                                             | `transitionTableState`       |
| 12  | Staff    | Moves a party to another table                                | **none - no surface calls it**                                                                                                                                                                                                                                                                                                                                                                                   | `moveTableVisit`             |
| 13  | Backend  | Freeing a table closes its visit, landing on `cleaning`       | -                                                                                                                                                                                                                                                                                                                                                                                                                | `transitionTableState`       |
| 14  | Guest    | Scans the code on the table                                   | `/t/:token` - [Table Session / Loading](../../.loki/reference/chrome_iphone7_Pages_Table_Session_Loading.png)                                                                                                                                                                                                                                                                                                    | -                            |
| 15  | Backend  | Resolves the token, or refuses with one of ten reasons        | -                                                                                                                                                                                                                                                                                                                                                                                                                | `resolveTableQrToken`        |
| 16  | Guest    | Confirms "You are ordering at Sakura Kitchen, table 12"       | `/t/:token` - [Confirm](../../.loki/reference/chrome_iphone7_Pages_Table_Session_Confirm.png), [Without A Room](../../.loki/reference/chrome_iphone7_Pages_Table_Session_Confirm_Without_Room.png)                                                                                                                                                                                                               | -                            |
| 17  | Backend  | Opens the session under whoever the guest already is          | -                                                                                                                                                                                                                                                                                                                                                                                                                | `startTableSession`          |
| 18  | Staff    | Seats the party, which confirms every guest waiting on it     | `/restaurant/:id/tables` - [Table Actions / Occupied](../../.loki/reference/chrome_laptop_Business_Table_Actions_Occupied.png)                                                                                                                                                                                                                                                                                   | `transitionTableState`       |
| 19  | Guest    | Reads the menu, sold-out dishes marked and not addable        | `/t/:token/order`, or `/m/:id` with no account - [Table Order / Ordering](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Ordering.png), [Menu / Read Only For A Guest](../../.loki/reference/chrome_iphone7_Components_Menu_Read_Only_For_A_Guest.png)                                                                                                                                                   | `loadPublicMenu`             |
| 20  | Guest    | Builds a cart and submits the order                           | `/t/:token/order` - [Cart With Lines](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Cart_With_Lines.png), [Placed](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Placed.png), [Refused Beside Cart](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Refused_Beside_Cart.png), [Submission Unresolved](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Submission_Unresolved.png) | `submitTableOrder`           |
| 21  | Staff    | Works the order queue and moves each status                   | `/restaurant/:id/orders` - [Order Queue / Busy](../../.loki/reference/chrome_laptop_Business_Order_Queue_Busy.png), [Alert On](../../.loki/reference/chrome_laptop_Business_Order_Queue_Alert_On.png)                                                                                                                                                                                                            | `transitionTableOrderStatus` |
| 22  | Guest    | Watches each order move, and orders again into the same visit | `/t/:token/order` - [Placed](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Placed.png), [Placed Replayed](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Placed_Replayed.png)                                                                                                                                                                                                                   | -                            |
| 23  | Guest    | Asks for help, or asks for the bill                           | `/t/:token/order` - [Ordering](../../.loki/reference/chrome_iphone7_Pages_Table_Order_Ordering.png), where both requests are offered                                                                                                                                                                                                                                                                             | `requestTableAssistance`     |
| 24  | Staff    | Acknowledges the call                                         | `/restaurant/:id/orders` - [Order Queue / Calling](../../.loki/reference/chrome_laptop_Business_Order_Queue_Calling.png), [Calling Busy](../../.loki/reference/chrome_laptop_Business_Order_Queue_Calling_Busy.png)                                                                                                                                                                                              | `acknowledgeTableAssistance` |
| 25  | Guest    | Pays in the app, or asks staff to settle                      | not built                                                                                                                                                                                                                                                                                                                                                                                                        | not built - [#1110]          |
| 26  | Staff    | Settles the bill and closes the visit                         | not built                                                                                                                                                                                                                                                                                                                                                                                                        | not built - [#1111]          |
| 27  | Guest    | Sees a receipt of the dishes they ordered                     | not built                                                                                                                                                                                                                                                                                                                                                                                                        | not built - [#1111]          |
| 28  | Guest    | Picks a dish and publishes a Bite                             | not built                                                                                                                                                                                                                                                                                                                                                                                                        | not built - [#1112]          |
| 29  | Backend  | Links menu item and Bite in both directions                   | not built                                                                                                                                                                                                                                                                                                                                                                                                        | not built - [#1113]          |

Steps 01 to 24 are implemented. Steps 25 to 29 are not.

**Surface** is the screen, and where a Storybook story shows that screen in the state
the step leaves it in, the story links to its committed Loki reference image.
**Callable** is the backend function the step runs. A step has one, the other, or both:
a Cloud Function has no screen, and an owner dragging a table on a canvas calls nothing
until they save.

**The guest half of this journey had no visual regression coverage at all until issue
[#1660].** Putting the two halves in one table is what exposed it: every owner and staff
surface the journey passes through was covered, and scanning a code, confirming a table,
building and sending a cart and asking for the bill had nothing between them. That is now
37 stories and 74 reference images, and the links above point at them.

Two gaps are left, and neither is a state of either screen: a populated order history and
a populated assistance feed, both of which need a Firestore listener rather than a
callable fake.

## Hand-offs

What crosses a stage boundary, and which page owns each side. These are the joins no
single use case can state, and the reason this page exists at all.

| What crosses                                                                            | Written by                       | Read by                                                                 | From       | To                                       |
| --------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| The **table token** - 130 bits of Crockford base32, naming a restaurant, room and table | Stage 1, on publish              | Stage 3, on the first scan                                              | Floor plan | The guest's phone, via a printed sticker |
| The **published table** - a document in `tables`                                        | Stage 1                          | Stages 2 and 3, both of which refuse a table that has no document there | Floor plan | Service and the scan                     |
| `tableOrdering.enabled` **and the time zone**                                           | Stage 1, on the restaurant page  | Stage 3, as the ordering verdict and the opening-hours clock            | Floor plan | The scan                                 |
| The **open visit** - `TableState.visitId`                                               | Stage 2, when staff seat a party | Stage 3, which joins the guest to it rather than creating one           | Service    | The guest's session                      |
| The **guest's uid** - a member's own, or an anonymous one                               | Stage 3, at `startTableSession`  | Stage 4, which needs the same uid to find the meal                      | The scan   | The receipt and the Bite                 |
| The **order lines** - name, price and currency as the guest agreed them                 | Stage 3, at submission           | Stage 4, which prefills a Bite from them                                | Ordering   | Bite creation                            |

## Where The Journey Breaks

Each of these is a defect **of the composition**: the use cases either side are correct
on their own pages, and the join between them is not.

### The guest's uid does not survive registering

Stage 3 files the session, the orders and the visit under the guest's uid. Where that
guest arrived signed out, the uid belongs to an anonymous account, and the design rests
on it being upgraded in place by `linkWith*` when they register.

Nothing upgrades it: `linkWith` appears in the workspace only in two comments. All three
sign-up paths mint a new account with a new uid.

Stage 4 is where this lands. Issue [#1112] prompts exactly that guest to register so the
dish becomes a Bite, and [#1111] promises the receipt is theirs permanently once they
have an account. Both read a uid that registering replaces, and both would pass their
own tests, because a freshly created test account is empty either way.

Owned by [#1657] - the link - and [#1658] - the move, for a guest who signs into an
account they already had, whom Firebase refuses to link. Both sit in stage 3, because
that is where the session they have to upgrade is written.

A member who was already signed in before scanning never meets this.

### A party that moves cannot be moved

Stage 2 promises a party that moves takes its visit and its orders with it.
`moveTableVisit` exists, keeps the visit's identity, and the orders hang from the visit
rather than the table - so the backend half is complete. No surface calls it, so staff
cannot do it.

### The guest count is written where nothing reads it

Stage 2 records the party size when staff seat a table. It lands in the audit entry
rather than on the visit, although `TableVisit.guestCount` exists to hold it and
`transitionTableState` already takes it.

## Related GitHub Scope

- Umbrella epic: [#735]
- Stage epics: [#1069], [#1070], [#1071], [#1072], [#1073]
- Open in stage 3: [#1565], [#1597], [#1598], [#1657], [#1658]
- Stage 4 children: [#1109], [#1110], [#1111], [#1112], [#1113], [#1114]

[#735]: https://github.com/muhammedgaygisiz/travellers-apps/issues/735
[#1069]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1069
[#1070]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1070
[#1071]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1071
[#1072]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1072
[#1073]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1073
[#1109]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1109
[#1110]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1110
[#1111]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1111
[#1112]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1112
[#1113]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1113
[#1114]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1114
[#1565]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1565
[#1597]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1597
[#1598]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1598
[#1660]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1660
[#1657]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1657
[#1658]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1658
