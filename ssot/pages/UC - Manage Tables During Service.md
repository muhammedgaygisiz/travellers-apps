# UC - Manage Tables During Service

## Status

Readable, not yet writable. Specified through issue \#1071 as stage 2 of issue \#735.

Issue \#1091 added the live state and the transition matrix to `libs/bite-tribe-common/model`. Issue \#1092 made the backend their only writer: `transitionTableState` validates a requested transition against the matrix and the caller's staff membership, applies it transactionally against the state the caller says it saw, and appends an audit entry per transition. Two staff members seating one table produce one seating and one explicit conflict. `firestore.rules` refuses every client write to the state and the trail, and admits the staff of that restaurant, the account holding it and the operator to read both.

Issue \#1093 put the first surface on it. `restaurant/:restaurantId/tables` in the business app draws the published plan read-only with each table's live status on it, updated by a Firestore listener rather than a poll, and it is the first route in that app a staff account is meant to reach. It reads and never writes: there is no write path through `bite-tribe-business/table-management` at all.

The **actions** are still issue \#1094. A staff member can see that table 6 has been awaiting payment for twenty minutes and cannot yet do anything about it from the screen; the callable that would is exercised by its emulator spec and by nothing else. The flow below is therefore half reachable - everything up to "staff tap a table" happens, and every transition after it does not.

[[UC - Configure Restaurant Floor Plans And Tables]] is complete and no longer blocks this. [[UC - Own And Claim Restaurants]] no longer blocks it either: the `staff` role now has its first write, through the callable rather than through the rules, and \#1093 gives a staff member somewhere to sign in to.

## Goal

Restaurant staff open one screen during service and see the room as it is: which tables are free, occupied, reserved, or being cleaned, and can change that in a single interaction.

## Actors

- Restaurant staff member
- Restaurant owner

## Planned Flow

- Staff sign in and land directly on the live room view, not the owner dashboard.
- The published floor plan renders read-only, with each table showing its live state.
- This is the floor-plan surface that carries a small screen. The editor of [[UC - Configure Restaurant Floor Plans And Tables]] was locked to a desktop width, because an owner laying out twenty tables to the millimetre is at a desk while a host greeting guests is holding a tablet at the door. Touch drag, pinch zoom, two-finger pan and long-press belong here, designed for seating a party rather than for moving a wall (issue \#1093).
- Staff tap a table and see only the transitions currently allowed.
- Seating a party opens a visit and records the guest count.
- Staff mark tables reserved, cleaning, or disabled as service demands.
- Freeing a table closes its visit.
- A party that moves takes its visit and its orders with it.
- End-of-service reset is available as a bulk action.

## Key Behaviours

- Live state lives in its own documents and is never written by the floor-plan editor. The editor never writes state, and state changes never write geometry.
- Transitions are applied by the backend against a single exported transition matrix, so two staff members seating the same table produce one seating and one explicit conflict. The matrix is `TABLE_STATE_TRANSITIONS` in `libs/bite-tribe-common/model`, tested over every ordered pair of statuses (issue \#1091); Firebase Functions cannot import the library, so it holds a copy that `table-state-parity.spec.ts` compares row by row (issue \#1092).
- The conflict is explicit because the caller names the state it saw. `transitionTableState` requires it, compares it inside the transaction, and refuses `aborted` with the status the table holds now, who set it and when - which is what the view renders as "someone else just seated this table" (issue \#1092).
- Every transition records who made it, in what capacity, when, from which state, and why, so a disputed table has a history. The entries are append-only, live under the restaurant rather than under the table, and survive the table being deleted (issue \#1092).
- A table the owner has taken out of service can be neither reserved nor seated, and a party already at one can still be freed (issue \#1092).
- Status is conveyed by colour, icon, and text together, never by colour alone. The three are not all in the same place, and that is deliberate (issue \#1093). The _plan_ carries the colour and a silhouette per status, because everything drawn on the floor-plan canvas is a share of its `viewBox` and a status word at plan scale is about eight pixels high - legible neither zoomed in nor out, since the ratio is zoom-invariant by design. The _word_ is in the summary bar above the plan, which lists every status the room is currently in, in the detail panel beside it, and in each table's accessible name. All three are on screen at once, so nothing is a hover away. What the criterion asks - that colour is never the sole carrier - is met by the silhouettes, which differ in shape and in filled-against-hollow and therefore survive greyscale, a print and a colour-vision deficiency.
- The time a table has been in its status is drawn on the table, in place of its seat count. It is what staff scan a room for, and a table already holding a party is not one a host is sizing up. A free table shows its capacity instead, because "free since" is a number nobody is looking for.
- The live view is the floor-plan surface that carries a small screen, and it collapses to one column rather than scrolling sideways. The layout switch is a **container** query rather than a media query: the page is what changes shape, and the question it asks is how much room it has rather than what device it is on (issue \#1093).
- The view keeps working offline: transitions queue, carry an idempotency key, and reconcile on reconnect rather than being silently forced or dropped.
- Staff have a narrower permission set than owners, enforced by security rules and not only by hidden UI.

## Success Criteria

- A state change on one device is visible on another within about a second.
- Two simultaneous seatings of the same table never produce two conflicting states.
- Going offline, seating two tables, and reconnecting results in exactly two transitions.
- Moving or deleting a table in the editor does not lose or corrupt its live state.
- Staff can always tell whether what they are looking at is live.

## Open Product Questions

These block implementation and are tracked in [[Current State - Open Questions]]:

- Must staff confirm occupancy, or may a guest scan occupy a table automatically?
- Can guests choose a table themselves?
- When is a table considered available again?
- Who can close or reopen a visit?

## Related GitHub Scope

- Issue \#1071 - Staff table management and live table state, with eight child issues

## Related Domains

- [[Table]]
- [[Table Visit]]
- [[Floor Plan]]
