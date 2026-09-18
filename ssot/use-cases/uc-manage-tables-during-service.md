# UC - Manage Tables During Service

## Status

**Level:** L1

Readable and writable, and usable in a room with no signal. Specified through issue [#1071]
as stage 2 of issue [#735] and built by its child issues [#1091] to [#1098], which `Flow`
and `Key Behaviours` cite step by step: staff read the published plan with each table's live
state at `restaurant/:restaurantId/tables`, change a table only through
`transitionTableState`, open and end a party's visit by seating and freeing it, keep working
offline, and the room's operations are measured. What no issue has added yet is a
**surface** for the visit: seating a table opens one and nothing shows it, which is also why
the guest count does not reach the visit (see `Flow`).

## Goal

Restaurant staff open one screen during service and see the room as it is: which tables are free, occupied, reserved, or being cleaned, and can change that in a single interaction.

This page owns a table's live state, the transition that changes it, the audit trail that
records it, and the visit a seating opens. Drawing and publishing the plan those tables sit
on is [UC - Configure Restaurant Floor Plans And Tables](uc-configure-restaurant-floor-plans-and-tables.md); the guest side of a table, and
the orders a visit will carry, is [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md); how an
account comes to hold the Restaurant at all is [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md).

## Actors

- **Restaurant Staff** - acts: signs in, lands on the room it works in through
  `staffEntryGuard`, and changes a table through `transitionTableState`. This was the first
  write the `staff` role had anywhere (issue [#1092]).
- **Restaurant Owner** - acts: opens the same room view and makes the same transitions,
  because a small restaurant is its own host. `restaurantAccessGuard` and
  `holdsTableStateAuthority` admit it beside the staff of that Restaurant.
- **BiteTribe Operator** - acts: admitted to `transitionTableState` by `RD-UR-6`, so a
  restaurant in trouble has a way back, and the audit entry records `admin` as the capacity
  it acted in. It has no screen of its own: no business-app route admits it, because the gate
  is `roleGuard('business', 'staff')`, and the admin app carries no table surface.

## Flow

- Staff sign in and land directly on the live room view, not the owner dashboard (issue [#1097]).
- The published floor plan renders read-only, with each table showing its live state.
- This is the floor-plan surface that carries a small screen. The editor of [UC - Configure Restaurant Floor Plans And Tables](uc-configure-restaurant-floor-plans-and-tables.md) was locked to a desktop width, because an owner laying out twenty tables to the millimetre is at a desk while a host greeting guests is holding a tablet at the door. Touch drag, pinch zoom, two-finger pan and long-press belong here, designed for seating a party rather than for moving a wall (issue [#1093]).
- Staff hold a table, or press enter on it, and see only the transitions currently allowed (issue [#1094]).
- Seating a party opens a visit and records the guest count. The visit opens (issue [#1095]); the count is still written to the audit entry rather than to the visit, because no surface sends it there yet, although `TableVisit.guestCount` exists to hold it and `transitionTableState` already takes it.
- Staff mark tables reserved, cleaning, or disabled as service demands (issue [#1094]).
- Freeing a table closes its visit (issue [#1095]), and lands the table on `cleaning` rather than `available`, so no table is silently reused.
- A party that moves takes its visit and its orders with it. `moveTableVisit` exists and keeps the visit's identity (issue [#1095]); the orders hang from the visit since issue [#1103] ([UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md)), and no surface calls the move yet.
- End-of-service reset is available as a bulk action (issue [#1094]).

## Key Behaviours

- Live state lives in its own documents and is never written by the floor-plan editor. The editor never writes state, and state changes never write geometry.
- Transitions are applied by the backend against a single exported transition matrix, so two staff members seating the same table produce one seating and one explicit conflict. The matrix is `TABLE_STATE_TRANSITIONS` in `libs/bite-tribe-common/model`, tested over every ordered pair of statuses (issue [#1091]); Firebase Functions cannot import the library, so it holds a copy that `table-state-parity.spec.ts` compares row by row (issue [#1092]).
- The conflict is explicit because the caller names the state it saw. `transitionTableState` requires it, compares it inside the transaction, and refuses `aborted` with the status the table holds now, who set it and when - which is what the view renders as "someone else just seated this table" (issue [#1092]).
- Every transition records who made it, in what capacity, when, from which state, and why, so a disputed table has a history. The entries are append-only, live under the restaurant rather than under the table, and survive the table being deleted (issue [#1092]).
- A table the owner has taken out of service can be neither reserved nor seated, and a party already at one can still be freed (issue [#1092]). A party cannot be moved onto one either (issue [#1095]).
- The party, not the table, is what orders and payment will hang from. A visit is opened by seating and ended by freeing, a table has at most one open visit at a time, and a move keeps the visit's id so nothing that pointed at it has to be rewritten (issue [#1095]). The tables a party sat at are read off the audit trail by its `visitId` rather than copied onto the visit, where a second list could disagree with the trail a disputed evening is read from.
- Status is conveyed by colour, icon, and text together, never by colour alone. The three are not all in the same place, and that is deliberate (issue [#1093]). The _plan_ carries the colour and a silhouette per status, because everything drawn on the floor-plan canvas is a share of its `viewBox` and a status word at plan scale is about eight pixels high - legible neither zoomed in nor out, since the ratio is zoom-invariant by design. The _word_ is in the summary bar above the plan, which lists every status the room is currently in, in the detail panel beside it, and in each table's accessible name. All three are on screen at once, so nothing is a hover away. What the criterion asks - that colour is never the sole carrier - is met by the silhouettes, which differ in shape and in filled-against-hollow and therefore survive greyscale, a print and a colour-vision deficiency.
- The time a table has been in its status is drawn on the table, in place of its seat count. It is what staff scan a room for, and a table already holding a party is not one a host is sizing up. A free table shows its capacity instead, because "free since" is a number nobody is looking for.
- The live view is the floor-plan surface that carries a small screen, and it collapses to one column rather than scrolling sideways. The layout switch is a **container** query rather than a media query: the page is what changes shape, and the question it asks is how much room it has rather than what device it is on (issue [#1093]).
- The transitions a table is offered are **derived** from the matrix rather than listed beside it (issue [#1094]). A hand-written set of buttons per status would be a second copy of the state machine, and the copy that drifts is the one nobody tests against the backend. It is also why the sheet offers `ordering` and `awaitingPayment`, which issue [#1094] does not name among its six actions: they are in the matrix, the plan draws, counts and times them, and a sheet that offered every status but those two would leave a room with no way to reach a state the view is built to show.
- The table changes on the press and is put back if the backend disagrees (issue [#1094]). A plan that waits for the round trip reads as a tap that missed, which is answered with a second tap the backend then refuses - so the feedback for a _successful_ seating would have been an error message. The guess is a layer over the listener rather than a write into it, so a rollback is a deletion and the true status is still underneath. It comes off when the listener delivers the transition itself, not when the callable answers, because the gap between the two is a visible flicker back to the old status.
- The end-of-service reset applies to the tables it can apply to and leaves the rest alone (issue [#1094]). A table already free has nothing to reset and a party still ordering is not one anybody meant to clear, so neither is sent to the backend to be refused; the button names how many tables it will actually free. Each table is its own transition, so thirty tables cleared is thirty audit entries naming who cleared them rather than one entry naming a room.
- Assembling that batch is a **mode** rather than a modifier key (issue [#1094]). The canvas reports every read-only tap as "this table alone", because a shift-click is not a gesture a host holding a tablet has.
- The view keeps working offline, and three separate things make that true (issue [#1096]). The _reads_ survive on Firestore's own cache, which every production build already enabled. The _writes_ survive in a durable queue keyed per account in device storage, because the gap can be the length of a service and a tablet gets locked, killed and reloaded inside it - and because the transitions of the lunchtime host must not be replayed under the evening host's name into a trail whose purpose is saying who moved a disputed table. And the _replay_ cannot double-apply, because every attempt carries the key minted when the intent was recorded and the backend answers the second attempt with what the first one wrote.
- A queued transition is refused rather than forced when the table has moved. Every entry carries the status the device was showing when the host acted, not the status the server holds now, and the backend compares that inside its transaction. One refusal takes the rest of _that table's_ queue with it and leaves every other table alone: the moves behind it were expecting a status the table never reached, so they are the same problem rather than a second one. Each is still reported, and the host is told which tables it happened to.
- The queue drains one entry at a time, in the order it was made, because a host who seated table 12 and then marked it ordering queued two transitions whose second expects the first to have landed. The end-of-service reset sends its tables in parallel for the opposite reason: those are independent tables, each its own transaction on its own document.
- A table waiting to be sent is drawn as the status the host asked for and _said_ to be waiting only in the detail panel, not on the plan. The plan already answers "what is this table doing"; "has anyone else been told" is a different question, and a second mark on a 900 mm circle would compete with the status glyph beside it. The clock on such a table runs from when the host acted, not from when the queue drains - a party seated twenty minutes before the signal came back has been there twenty minutes.
- Whether the room is live is answered in four states rather than two, because the two no answers lead to different next moves. `connecting` is before the first snapshot. `offline` is a connection that has just gone, where what is on screen was true moments ago. `stale` is the same connection still gone a minute later, and it carries the age - "not current" without a number is a warning nobody can act on. Liveness is not read off the states themselves: a quiet Tuesday afternoon and a listener the SDK detached both look like silence, so the delivery carries its own arrival time and the health of the listener, and the device's network state is read from the one `NetworkStatusService` in `libs/common` rather than from a second connectivity mechanism.
- What the room did is measured from the **confirmed** transition and never from the tap (issue [#1098]). The staff view is optimistic by design: it draws a transition the moment it is asked for and takes it back if the backend disagrees, and a taxonomy that counted the drawing would count every refusal as a seating and every offline queue as a loss. So the events are emitted where the callable answers and where a queued transition lands, a `replayed` answer is counted once, and the five table events are keyed on the status the staff member picked with the status they left travelling as a parameter - freeing an occupied table and putting a blocked one back into service are the same transition and not the same sentence. A seating produces `table_seated` **and** `table_visit_opened`, because a place in the room and a party that will carry orders are different objects; any count of seatings therefore reads one of the two names and never their sum.
- Staff have a narrower permission set than owners, enforced by security rules and not only by hidden UI (issue [#1097]). The narrowing is made almost entirely of refusals, so the rules suite carries them as its own cases rather than relying on the allow cases to imply them: the floor plan, the restaurant, the menu and the staff association are all read-only or closed to a staff account, and the one thing the role writes it writes through `transitionTableState`, which bypasses the rules. The full matrix is [User Roles](../product/user-roles.md).
- Revocation takes effect at the data layer immediately, not at the next token refresh (issue [#1097]). `worksAt()` in `firestore.rules` requires the `staff` claim **and** the `/restaurantStaff/{uid}` document naming this restaurant, and `removeRestaurantStaff` deletes the document at once - so the hour a stale ID token can still claim the role buys nothing. What the hour does still cost is the sign-out: the account keeps the business app open, reading nothing, until `roleGuard` sees a refreshed token without the claim.
- The entry is a guard rather than a second landing page (issue [#1097]). `AFTER_LOGIN_PAGE` is one string for the whole app and the answer depends on the account, and a redirect written into the sign-in effect would have covered only the sign-in - leaving a restored session and a bookmark on the empty dashboard.

## Success Criteria

Each criterion names what verifies it. Read against the suite on 12 September 2026, after the last child issue merged.

- A state change on one device is visible on another within about a second. **Mechanism verified**, by `live-table-view.spec.ts` → "shows the room as it stands and follows it as it changes": a state written to the emulator by something that is not the browser appears without anything being asked for again. That is the Firestore listener, which makes the delay a round trip rather than a poll interval. The _one second_ is the round trip and not a measured bound - nothing asserts a latency figure, and a criterion stated as a number should say so.
- Two simultaneous seatings of the same table never produce two conflicting states. **Verified**, by `transition-table-state.emulator-spec.ts` → `describe('two staff acting at once')`: "produces one seating and one conflict", "resolves a seating against a reservation to one outcome", "tells the loser what the table holds and who changed it", and "lets two tables be seated at once" for the case that must _not_ conflict.
- Going offline, seating two tables, and reconnecting results in exactly two transitions. **Verified** (issue [#1096]), by "keeps two queued seatings to two transitions".
- Moving or deleting a table in the editor does not lose or corrupt its live state. **Met in substance, one half untested.** A move keeps the table's id, so the state document - keyed on that id - is untouched by construction. A deletion is tested from the record's side: "survives the deletion of the table it describes" for the audit trail, "answers a replay for a table that is no longer on the plan" for the queue, and `TableVisit.tableId` is a plain string precisely so a visit outlives its table. What nothing tests, and nothing does, is **clean up** `tableStates/{tableId}` when the table goes: no trigger deletes it, so an orphaned state document is left behind. Nothing is lost and nothing is corrupted - the live view draws states only for tables that exist, so an orphan is invisible - but orphans accumulate silently. Recorded in [Current State - Known Issues](../current-state/known-issues.md).
- Staff can always tell whether what they are looking at is live, and how long ago it stopped being so. **Verified** (issue [#1096]), by the four-state indicator and its specs.
- Table operations are measured. **Verified in production** on 12 September 2026 - see [Implementation - Analytics Events](../implementation/analytics-events.md) for the run.

## Open Product Questions

These block implementation and are tracked in [Current State - Open Questions](../current-state/open-questions.md):

- Must staff confirm occupancy, or may a guest scan occupy a table automatically?
- Can guests choose a table themselves?
- When is a table considered available again?
- Who can close or reopen a visit? Half-answered by issue [#1095]: any staff member of that restaurant can close one, recorded in the audit trail, and **nobody** can reopen one - a closed visit is not reopened, because the party that comes back for a coffee is a new party at that table.

## MVP Classification

**[Secondary]** - the whole page. Its only surface is `restaurant/:restaurantId/tables` in the
business app, which is out of scope for this release candidate by decision and gets its own
soft launch; [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md) records that.

Not on this page: the guest side of a table and the orders a visit will carry, both
[UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md).

## App Store Review Area

Not relevant, because nothing this page describes is store-distributed: the live view is a
route in the business app, and only `apps/bite-tribe-ios` and `apps/bite-tribe-android` carry a
native project. It would become relevant the moment a guest reached a table from a store
build - the session a seating activates is already written by `transitionTableState` - and
that surface is [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md)'s.

## Supported Evidence

- `libs/bite-tribe-business/table-management/{page,data-access}`, the live room view at
  `restaurant/:restaurantId/tables`, gated by `staffEntryGuard` and `restaurantAccessGuard`
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/transition-table-state.ts`
  (`transitionTableState`) and `move-table-visit.ts` (`moveTableVisit`)
- `libs/bite-tribe-common/model/src/lib/table-state.ts`, `TABLE_STATE_TRANSITIONS`, and
  `apps/bite-tribe-firebase/functions/src/__specs__/table-state-parity.spec.ts`, which compares
  the Functions copy against it row by row
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/__specs__/transition-table-state.emulator-spec.ts`,
  the two-staff-acting-at-once conflict suite
- `apps/bite-tribe-business-e2e/src/tests/live-table-view.spec.ts`, covering real-time sync
  across devices, the offline write queue and replay, and the four-state liveness indicator
- [Implementation - Analytics Events](../implementation/analytics-events.md), the production run of the seven `table_*` events

## Related GitHub Scope

- Issue [#1071] - Staff table management and live table state, with eight child issues
- Issue [#1098] - Analytics on table operations. `table_visit_moved` is deferred to the issue that gives a visit somewhere to move to

## Related Domains

- [Table](../domain/table.md)
- [Table Visit](../domain/table-visit.md)
- [Floor Plan](../domain/floor-plan.md)

## Related Pages

- [UC - Configure Restaurant Floor Plans And Tables](uc-configure-restaurant-floor-plans-and-tables.md) - draws and publishes the plan this
  view reads, and never writes a live state
- [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md) - the guest side of a table, and the orders a
  visit will carry
- [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md) - how an account comes to hold the Restaurant whose room
  this is
- [User Roles](../product/user-roles.md) - the full permission matrix behind the three roles above
- [Recorded Decisions](../decisions/recorded-decisions.md) - `RD-UR-6`, why the operator is admitted to a Restaurant it does not
  own
- [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md) - the business app's scope for this
  release candidate
- [Current State - Known Issues](../current-state/known-issues.md) - the orphaned `tableStates` document a deleted table
  leaves behind
- [Current State - Open Questions](../current-state/open-questions.md) - the four questions in `Open Product Questions`
- [Implementation - Analytics Events](../implementation/analytics-events.md) - the production run of the seven `table_*` events

[#735]: https://github.com/muhammedgaygisiz/travellers-apps/issues/735
[#1071]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1071
[#1091]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1091
[#1092]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1092
[#1093]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1093
[#1094]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1094
[#1095]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1095
[#1096]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1096
[#1097]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1097
[#1098]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1098
[#1103]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1103
