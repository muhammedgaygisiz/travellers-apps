# UC - Manage Tables During Service

## Status

Started at the model. Specified through issue \#1071 as stage 2 of issue \#735.

Issue \#1091 added the live state and the transition matrix to `libs/bite-tribe-common/model`. Nothing writes or reads a state document yet: the callable that applies a transition is issue \#1092 and the live view is issue \#1093, so none of the flow below is reachable.

[[UC - Configure Restaurant Floor Plans And Tables]] is complete and no longer blocks this. [[UC - Own And Claim Restaurants]] still does: the `staff` role is grantable and the security rules give it no write, so a staff member has nothing to sign in to.

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
- Transitions are applied by the backend against a single exported transition matrix, so two staff members seating the same table produce one seating and one explicit conflict. The matrix is `TABLE_STATE_TRANSITIONS` in `libs/bite-tribe-common/model`, tested over every ordered pair of statuses (issue \#1091).
- Every transition records who made it, when, from which state, and why, so a disputed table has a history.
- Status is conveyed by colour, icon, and text together, never by colour alone.
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
