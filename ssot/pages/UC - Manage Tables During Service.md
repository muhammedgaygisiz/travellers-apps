# UC - Manage Tables During Service

## Status

Readable and writable, and now usable in a room with no signal. Specified through issue \#1071 as stage 2 of issue \#735.

Issue \#1091 added the live state and the transition matrix to `libs/bite-tribe-common/model`. Issue \#1092 made the backend their only writer: `transitionTableState` validates a requested transition against the matrix and the caller's staff membership, applies it transactionally against the state the caller says it saw, and appends an audit entry per transition. Two staff members seating one table produce one seating and one explicit conflict. `firestore.rules` refuses every client write to the state and the trail, and admits the staff of that restaurant, the account holding it and the operator to read both.

Issue \#1093 put the first surface on it. `restaurant/:restaurantId/tables` in the business app draws the published plan read-only with each table's live status on it, updated by a Firestore listener rather than a poll, and it is the first route in that app a staff account is meant to reach. It reads and never writes: there is no write path through `bite-tribe-business/table-management` at all.

Issue \#1094 closed the loop. Holding a table, or pressing enter on it, opens a sheet of exactly the transitions the matrix allows from the status that table holds right now, and picking one calls `transitionTableState`. The table changes colour on the press rather than on the answer, and a refusal takes the change back and says why - a conflict names the colleague who got there first rather than reading as a generic failure. An end-of-service reset frees a batch of tables in one press. The staff member who could see that table 6 had been awaiting payment for twenty minutes can now do something about it from the same screen.

Issue \#1095 put the party behind the status. A `TableVisit` at `/restaurants/{restaurantId}/visits/{visitId}` is the party at a table over time, and seating a table now _is_ opening one: a transition into `occupied` from a status that held no party writes the visit, the state and the audit entry in one commit, and a transition out of the party statuses ends it. A table cannot have two open visits, ending one lands the table on `cleaning` rather than `available`, and `moveTableVisit` walks a party to another table keeping the visit's id - which is what will keep its orders when issue \#1072 gives it some. The visit outlives its table: it lives under the restaurant, and `tableId` is a plain string that keeps naming a table deleted from the plan.

Issue \#1096 made the view survive the room it is used in. Firestore offline
persistence was already on in every production build, so the plan keeps drawing without
a signal; what was missing was everything about the _writes_. A transition made offline
is now written to device storage rather than sent, carries an idempotency key minted
once per intent, and is replayed in order when the signal comes back - so two tables
seated in a basement dining room are two transitions on reconnect and not four, and a
tablet locked or reloaded inside the gap comes back showing the tables the host seated.
`transitionTableState` answers a replay off its own audit trail, before it checks the
table and before it compares `expectedStatus`, because a replay arrives after the world
has moved on. A queued transition the table has genuinely moved past is refused and
named to the host rather than forced or dropped. And the header now says which of four
things is true - connecting, live, offline, or not current and how long since - which is
what makes "staff can always tell whether what they are looking at is live" checkable
rather than assumed.

Issue \#1097 settled what the role may do, and where it starts. Most of the
permission set had arrived ahead of it, one piece per issue that needed it -
\#1537 the grant and the staff list, \#1088 the published-plan read, \#1092 the
one write - so what \#1097 added is the two things nobody had reached: the
entry, and the proof. Signing in now lands a staff account in the room it works
in rather than on the owner's dashboard, which lists restaurants by
`Restaurant.ownerUserId` and therefore showed it nothing; `staffEntryGuard`
reads the association on `/dashboard` and redirects, so a restored session and a
bookmark land there too. And the refusals are now under test rather than
asserted: a staff account writing a room, a table, a room draft, a menu or
another account's association is refused by `firestore.rules` in the emulator
suite, and every read the role has ends the moment the association is deleted -
with the `staff` claim still on its token, which is what makes revocation take
effect before the token refreshes rather than an hour after it.

Issue \#1098 made the room measurable. Seven `table_*` events now record what
staff actually do during a service - a table seated, freed, reserved, sent for
cleaning or taken out of service, and a visit opened or ended - and they record
it only when the backend has confirmed the transition, so a refusal is not a
seating and a transition made offline is counted when it lands rather than twice
or never. Three measures fall out of them per restaurant per service day: table
turnover, the share of tables that were used at all, and how long a party
occupied a table. They are computed over the BigQuery export
(`tools/analytics/queries/table-operations.sql`) rather than as launch-dashboard
tiles, because the dashboard is scoped to launch signals and how a restaurant
works its room is not one. No guest is named in any of it: the parameters are the
restaurant's own ids, a party size and an opaque visit id, and who moved a
disputed table stays the audit trail's answer rather than analytics'. The one
event the issue named and did not get is `table_visit_moved`, for the reason
below - there is nothing to move a visit from.

What no issue has added yet is a **surface** for the visit. Seating a table through issue \#1094's sheet opens a visit, and nothing shows it. The guest count is still optional in the sheet and still travels as the audit entry's `reason`; `TableVisit.guestCount` now exists to hold it and `transitionTableState` now takes it, so moving it across is a change to the business app rather than to the backend.

[[UC - Configure Restaurant Floor Plans And Tables]] is complete and no longer blocks this. [[UC - Own And Claim Restaurants]] no longer blocks it either: the `staff` role now has its first write, through the callable rather than through the rules, and \#1093 gives a staff member somewhere to sign in to.

## Goal

Restaurant staff open one screen during service and see the room as it is: which tables are free, occupied, reserved, or being cleaned, and can change that in a single interaction.

## Actors

- Restaurant staff member
- Restaurant owner

## Planned Flow

- Staff sign in and land directly on the live room view, not the owner dashboard (issue \#1097).
- The published floor plan renders read-only, with each table showing its live state.
- This is the floor-plan surface that carries a small screen. The editor of [[UC - Configure Restaurant Floor Plans And Tables]] was locked to a desktop width, because an owner laying out twenty tables to the millimetre is at a desk while a host greeting guests is holding a tablet at the door. Touch drag, pinch zoom, two-finger pan and long-press belong here, designed for seating a party rather than for moving a wall (issue \#1093).
- Staff hold a table, or press enter on it, and see only the transitions currently allowed (issue \#1094).
- Seating a party opens a visit and records the guest count. The visit opens (issue \#1095); the count is still written to the audit entry rather than to the visit, because no surface sends it there yet.
- Staff mark tables reserved, cleaning, or disabled as service demands (issue \#1094).
- Freeing a table closes its visit (issue \#1095), and lands the table on `cleaning` rather than `available`, so no table is silently reused.
- A party that moves takes its visit and its orders with it. `moveTableVisit` exists and keeps the visit's identity (issue \#1095); the orders are issue \#1072, and no surface calls the move yet.
- End-of-service reset is available as a bulk action (issue \#1094).

## Key Behaviours

- Live state lives in its own documents and is never written by the floor-plan editor. The editor never writes state, and state changes never write geometry.
- Transitions are applied by the backend against a single exported transition matrix, so two staff members seating the same table produce one seating and one explicit conflict. The matrix is `TABLE_STATE_TRANSITIONS` in `libs/bite-tribe-common/model`, tested over every ordered pair of statuses (issue \#1091); Firebase Functions cannot import the library, so it holds a copy that `table-state-parity.spec.ts` compares row by row (issue \#1092).
- The conflict is explicit because the caller names the state it saw. `transitionTableState` requires it, compares it inside the transaction, and refuses `aborted` with the status the table holds now, who set it and when - which is what the view renders as "someone else just seated this table" (issue \#1092).
- Every transition records who made it, in what capacity, when, from which state, and why, so a disputed table has a history. The entries are append-only, live under the restaurant rather than under the table, and survive the table being deleted (issue \#1092).
- A table the owner has taken out of service can be neither reserved nor seated, and a party already at one can still be freed (issue \#1092). A party cannot be moved onto one either (issue \#1095).
- The party, not the table, is what orders and payment will hang from. A visit is opened by seating and ended by freeing, a table has at most one open visit at a time, and a move keeps the visit's id so nothing that pointed at it has to be rewritten (issue \#1095). The tables a party sat at are read off the audit trail by its `visitId` rather than copied onto the visit, where a second list could disagree with the trail a disputed evening is read from.
- Status is conveyed by colour, icon, and text together, never by colour alone. The three are not all in the same place, and that is deliberate (issue \#1093). The _plan_ carries the colour and a silhouette per status, because everything drawn on the floor-plan canvas is a share of its `viewBox` and a status word at plan scale is about eight pixels high - legible neither zoomed in nor out, since the ratio is zoom-invariant by design. The _word_ is in the summary bar above the plan, which lists every status the room is currently in, in the detail panel beside it, and in each table's accessible name. All three are on screen at once, so nothing is a hover away. What the criterion asks - that colour is never the sole carrier - is met by the silhouettes, which differ in shape and in filled-against-hollow and therefore survive greyscale, a print and a colour-vision deficiency.
- The time a table has been in its status is drawn on the table, in place of its seat count. It is what staff scan a room for, and a table already holding a party is not one a host is sizing up. A free table shows its capacity instead, because "free since" is a number nobody is looking for.
- The live view is the floor-plan surface that carries a small screen, and it collapses to one column rather than scrolling sideways. The layout switch is a **container** query rather than a media query: the page is what changes shape, and the question it asks is how much room it has rather than what device it is on (issue \#1093).
- The transitions a table is offered are **derived** from the matrix rather than listed beside it (issue \#1094). A hand-written set of buttons per status would be a second copy of the state machine, and the copy that drifts is the one nobody tests against the backend. It is also why the sheet offers `ordering` and `awaitingPayment`, which issue \#1094 does not name among its six actions: they are in the matrix, the plan draws, counts and times them, and a sheet that offered every status but those two would leave a room with no way to reach a state the view is built to show.
- The table changes on the press and is put back if the backend disagrees (issue \#1094). A plan that waits for the round trip reads as a tap that missed, which is answered with a second tap the backend then refuses - so the feedback for a _successful_ seating would have been an error message. The guess is a layer over the listener rather than a write into it, so a rollback is a deletion and the true status is still underneath. It comes off when the listener delivers the transition itself, not when the callable answers, because the gap between the two is a visible flicker back to the old status.
- The end-of-service reset applies to the tables it can apply to and leaves the rest alone (issue \#1094). A table already free has nothing to reset and a party still ordering is not one anybody meant to clear, so neither is sent to the backend to be refused; the button names how many tables it will actually free. Each table is its own transition, so thirty tables cleared is thirty audit entries naming who cleared them rather than one entry naming a room.
- Assembling that batch is a **mode** rather than a modifier key (issue \#1094). The canvas reports every read-only tap as "this table alone", because a shift-click is not a gesture a host holding a tablet has.
- The view keeps working offline, and three separate things make that true (issue \#1096). The _reads_ survive on Firestore's own cache, which every production build already enabled. The _writes_ survive in a durable queue keyed per account in device storage, because the gap can be the length of a service and a tablet gets locked, killed and reloaded inside it - and because the transitions of the lunchtime host must not be replayed under the evening host's name into a trail whose purpose is saying who moved a disputed table. And the _replay_ cannot double-apply, because every attempt carries the key minted when the intent was recorded and the backend answers the second attempt with what the first one wrote.
- A queued transition is refused rather than forced when the table has moved. Every entry carries the status the device was showing when the host acted, not the status the server holds now, and the backend compares that inside its transaction. One refusal takes the rest of _that table's_ queue with it and leaves every other table alone: the moves behind it were expecting a status the table never reached, so they are the same problem rather than a second one. Each is still reported, and the host is told which tables it happened to.
- The queue drains one entry at a time, in the order it was made, because a host who seated table 12 and then marked it ordering queued two transitions whose second expects the first to have landed. The end-of-service reset sends its tables in parallel for the opposite reason: those are independent tables, each its own transaction on its own document.
- A table waiting to be sent is drawn as the status the host asked for and _said_ to be waiting only in the detail panel, not on the plan. The plan already answers "what is this table doing"; "has anyone else been told" is a different question, and a second mark on a 900 mm circle would compete with the status glyph beside it. The clock on such a table runs from when the host acted, not from when the queue drains - a party seated twenty minutes before the signal came back has been there twenty minutes.
- Whether the room is live is answered in four states rather than two, because the two no answers lead to different next moves. `connecting` is before the first snapshot. `offline` is a connection that has just gone, where what is on screen was true moments ago. `stale` is the same connection still gone a minute later, and it carries the age - "not current" without a number is a warning nobody can act on. Liveness is not read off the states themselves: a quiet Tuesday afternoon and a listener the SDK detached both look like silence, so the delivery carries its own arrival time and the health of the listener, and the device's network state is read from the one `NetworkStatusService` in `libs/common` rather than from a second connectivity mechanism.
- What the room did is measured from the **confirmed** transition and never from the tap (issue \#1098). The staff view is optimistic by design: it draws a transition the moment it is asked for and takes it back if the backend disagrees, and a taxonomy that counted the drawing would count every refusal as a seating and every offline queue as a loss. So the events are emitted where the callable answers and where a queued transition lands, a `replayed` answer is counted once, and the five table events are keyed on the status the staff member picked with the status they left travelling as a parameter - freeing an occupied table and putting a blocked one back into service are the same transition and not the same sentence. A seating produces `table_seated` **and** `table_visit_opened`, because a place in the room and a party that will carry orders are different objects; any count of seatings therefore reads one of the two names and never their sum.
- Staff have a narrower permission set than owners, enforced by security rules and not only by hidden UI (issue \#1097). The narrowing is made almost entirely of refusals, so the rules suite carries them as its own cases rather than relying on the allow cases to imply them: the floor plan, the restaurant, the menu and the staff association are all read-only or closed to a staff account, and the one thing the role writes it writes through `transitionTableState`, which bypasses the rules. The full matrix is [[User Roles]].
- Revocation takes effect at the data layer immediately, not at the next token refresh (issue \#1097). `worksAt()` in `firestore.rules` requires the `staff` claim **and** the `/restaurantStaff/{uid}` document naming this restaurant, and `removeRestaurantStaff` deletes the document at once - so the hour a stale ID token can still claim the role buys nothing. What the hour does still cost is the sign-out: the account keeps the business app open, reading nothing, until `roleGuard` sees a refreshed token without the claim.
- The entry is a guard rather than a second landing page (issue \#1097). `AFTER_LOGIN_PAGE` is one string for the whole app and the answer depends on the account, and a redirect written into the sign-in effect would have covered only the sign-in - leaving a restored session and a bookmark on the empty dashboard.

## Success Criteria

- A state change on one device is visible on another within about a second.
- Two simultaneous seatings of the same table never produce two conflicting states.
- Going offline, seating two tables, and reconnecting results in exactly two transitions (met by issue \#1096).
- Moving or deleting a table in the editor does not lose or corrupt its live state.
- Staff can always tell whether what they are looking at is live, and how long ago it stopped being so (met by issue \#1096).

## Open Product Questions

These block implementation and are tracked in [[Current State - Open Questions]]:

- Must staff confirm occupancy, or may a guest scan occupy a table automatically?
- Can guests choose a table themselves?
- When is a table considered available again?
- Who can close or reopen a visit? Half-answered by issue \#1095: any staff member of that restaurant can close one, recorded in the audit trail, and **nobody** can reopen one - a closed visit is not reopened, because the party that comes back for a coffee is a new party at that table.

## Related GitHub Scope

- Issue \#1071 - Staff table management and live table state, with eight child issues
- Issue \#1098 - Analytics on table operations. `table_visit_moved` is deferred to the issue that gives a visit somewhere to move to

## Related Domains

- [[Table]]
- [[Table Visit]]
- [[Floor Plan]]
