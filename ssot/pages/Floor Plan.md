# Floor Plan

## Purpose

A Floor Plan is a restaurant's structured two-dimensional representation of its dining area.

It is the structural connection between a restaurant's physical space and its digital BiteTribe presence. Rooms, tables, and objects become addressable data instead of a drawing.

## Why It Exists

The Floor Plan exists to answer:

> Which physical places in this restaurant can a guest sit at, and how do I address one of them digitally?

Without it, a table QR code, a live occupancy view, and an order attached to table 12 have nothing to refer to.

The Floor Plan is deliberately not an architecturally exact construction plan. It is a practical, easy-to-maintain top-down representation that staff and guests can recognise.

## Business Rules

- A Restaurant can have one Floor Plan.
- A Floor Plan contains one or more Rooms, which may represent rooms, floors, or outdoor areas.
- A Room has physical dimensions and contains geometry objects and Tables.
- Geometry objects are walls, doors, counters, bar areas, blocked areas, chairs, and decorative objects. They carry no business identity.
- A Table is a business entity, not a shape. See [[Table]].
- Chairs are geometry. Seating capacity is a number on the Table.
- A Room cannot be deleted while it still contains Tables.
- Rooms have an owner-chosen order that is stored, not derived, so it survives a reload.
- A Room may name the floor or level it sits on. The name groups Rooms for display and never changes their order.
- A Floor Plan has a draft state and a published state. Only the published state is read by staff and guest surfaces.
- A draft belongs to a Room, and a Room has at most one. It is autosaved as the owner works, so closing the browser mid-edit and coming back opens on what they left.
- Publishing is explicit, and it is refused while the plan carries a blocking error: a table with no number, two tables with one number, a capacity below one, or a table whose centre is outside its room. Overlapping tables warn instead, because real rooms have tables pushed together.
- Discarding a draft returns the room to the published plan. It is the only action in the editor that destroys work the owner cannot get back, so it is the only one that asks.
- Editing the Floor Plan never writes live table state, and a live state change never writes the Floor Plan.
- Only the owner of the Restaurant may edit the Floor Plan.

## Coordinate System

Coordinates are stored as room-relative integer millimetres.

| Property | Rule                                         |
| -------- | -------------------------------------------- |
| Origin   | Top-left corner of the room                  |
| x        | Increases to the right                       |
| y        | Increases downward                           |
| Unit     | Millimetres, integer                         |
| Rotation | Degrees clockwise, 0 to 359                  |
| Position | Centre of the shape's unrotated bounding box |

Physical units rather than pixels or normalised values, because real dimensions let the plan be checked for plausibility, printed to scale, and reasoned about for capacity. Integers avoid floating-point drift when snapping. Rendering uses an SVG `viewBox` in millimetres, so desktop, tablet, and mobile scale from identical stored data.

A position is the centre and not a corner, for geometry objects exactly as for tables, so that `rotation` means one thing everywhere: the shape turns about its own position, and a rotated object keeps the anchor the editor dragged. Issue \#1080 made that explicit when the model was written; the earlier wording named only the table and left an object's anchor undecided.

## Required Data

Room:

| Field     | Description                                          |
| --------- | ---------------------------------------------------- |
| `id`      | Unique room identifier                               |
| `name`    | Display name, such as main dining room or terrace    |
| `order`   | Ascending display order among the restaurant's rooms |
| `floor`   | Optional level name, such as `Ground floor`          |
| `size`    | `{ width, height }` in millimetres                   |
| `objects` | Geometry objects in the room                         |
| `version` | Optimistic concurrency version                       |

Draft (issue \#1088):

| Field       | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `name`      | The room's name as the owner has it now                                |
| `floor`     | The level, absent when the owner named none                            |
| `size`      | The room's dimensions as the owner has them now                        |
| `objects`   | The geometry standing in the room                                      |
| `tables`    | The tables of the room, as whole entities                              |
| `revision`  | Optimistic concurrency for the draft, counted separately from the room |
| `updatedAt` | When the draft was last written, epoch milliseconds                    |

Floor plan object:

| Field      | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `id`       | Unique object identifier                                           |
| `type`     | `wall`, `door`, `counter`, `bar`, `blocked`, `decoration`, `chair` |
| `position` | `{ x, y }` in room millimetres, centre of the object               |
| `size`     | `{ width, height }` in millimetres                                 |
| `rotation` | Degrees clockwise                                                  |
| `label`    | Optional display label                                             |

## Optional Data

- Grid spacing preference

Floor grouping and the per-room capacity summary were on this list until issue
\#1085 delivered both. `floor` is now a field of the Room and the summary is
derived rather than stored, because a table count that had to be maintained
alongside the tables is a count that goes wrong.

## Relationships

```text
Restaurant
|-- Floor Plan
    |-- Rooms                       the published plan
    |   |-- Floor plan objects (geometry)
    |   |-- Draft                   the arrangement in progress
    |-- Tables (business entities)  the published tables
```

## Lifecycle

```text
Restaurant is owned by a user with the business role
|
Owner creates a room and sets its dimensions
|
Owner places geometry and tables
|
Owner assigns table numbers and capacities
|
Owner validates and publishes the plan
|
QR tokens are generated for enabled tables
|
Published plan is read by staff live view and by guest QR resolution
```

## Permissions

- Guest: no access to the plan structure. A guest only ever resolves a single table through a QR token.
- Registered user: no access.
- Restaurant staff: read the published plan. No write access.
- Restaurant owner: full read and write.
- Admin: read the published plan for support and moderation, and not the draft. Editing the plan is restaurant maintenance, and `admin` does not imply `business` (issue \#1164), so an edit goes through the assigned owner.

`firestore.rules` enforces all of this since issue \#1081, and the staff clause it deliberately left out arrived with issue \#1088. A staff read is a read of the _published_ plan, and admitting staff before there was a published state would have handed them the draft an owner was halfway through rearranging. It now cannot: the draft is a document of its own at `rooms/{roomId}/drafts/current`, with its own match block and no staff clause in it, and an unpublished table has no document under `tables` at all. The read is scoped to the one restaurant the account works at rather than to `staff` as a role - a blanket clause would make the role a key to every restaurant's interior in BiteTribe, which is the shape of hole issue \#1537 closed for the restaurant document.

The operator is refused the draft as well, and for a narrower reason: support answers questions about the plan a restaurant is running, and an owner's unpublished rearrangement is not that plan.

## Use Cases

- [[UC - Configure Restaurant Floor Plans And Tables]]
- [[UC - Order At The Table Through A QR Code]]

## Related Epics

- Issue \#735 - Restaurant Interaction Platform (umbrella)
- Issue \#1070 - Restaurant floor plan and table configuration
- Issue \#1069 - Restaurant ownership, claiming and authorization (prerequisite)

## Technical Implementation

Firestore layout, real since issue \#1081 and extended by issue \#1088:

```text
/restaurants/{restaurantId}/rooms/{roomId}                 published room
/restaurants/{restaurantId}/rooms/{roomId}/drafts/current  work in progress
/restaurants/{restaurantId}/tables/{tableId}               published table
```

Non-table geometry lives as an array inside its room document because it is always loaded and saved together. Tables are separate documents because they are business entities with independent lifecycles, referenced by live state, visits, and orders.

The draft is a document of its own rather than a field of the room, and that is what makes "staff never see the draft" a structural fact rather than a promise: security rules cannot hide one field of a document from one reader, so a draft on the room document would have been readable by everybody who reads the room. A subcollection has its own match block, and staff are not in it.

Libraries:

```text
libs/bite-tribe-common/model                        floor plan, room, table and draft types
libs/bite-tribe-business/floor-plan/data-access     load, save, draft, conflict signalling
libs/bite-tribe-business/floor-plan/page            the editor page, its workflow, the publish validation
libs/bite-tribe-business/floor-plan/ui              the canvas, the grid, the units, the palette, the edit geometry
```

Issue \#1080 wrote the model as two files in `libs/bite-tribe-common/model/src/lib`: `floor-plan.ts` holds `Room`, `FloorPlanObject`, and the coordinate-system primitives `Millimetres`, `FloorPlanPoint`, `FloorPlanSize`, and `FloorPlanRotation`; `restaurant-table.ts` holds `RestaurantTable`. The coordinate system above is repeated as the file header of `floor-plan.ts`, because the rule has to be readable where the fields are.

`RestaurantTable` is a union discriminated on `shape`, so a `round` table carries a `diameter` and a `rectangle` carries a `size` and neither can carry both. That library is types only, so nothing in it can drift into a helper the persistence layer should own.

Issue \#1081 made the layout real. `apps/bite-tribe-firebase/firestore.rules` scopes both collections to the account holding the restaurant, for reads as well as writes: the plan is a new collection with no prior read behaviour to preserve, and a restaurant's interior layout is not something every signed-in account should be able to enumerate.

`libs/bite-tribe-business/floor-plan/data-access` is the client half. `loadRoomPlan` is one document read plus one tables query however many objects are drawn, `saveRoom` writes only the room document, and `deleteRoom` refuses while a table still names the room.

Optimistic concurrency lives in the rules rather than in the client. A room save carries `version + 1` of the version it was read at, and the rule accepts the write only when that is the successor of the stored version; a create must be version 1. Two devices that both read version `n` therefore cannot both land: the second is refused and gets a `FloorPlanConflictError` carrying the stored room, so the owner is offered what is stored instead of silently overwriting a rearrangement they never saw. A rule rather than a transaction, because a transaction protects only the client that opens one.

The room-cannot-be-deleted-while-it-holds-tables rule is the one business rule the rules file cannot carry: security rules read named documents and cannot query, so no rule can ask whether a collection is empty. It is enforced in the data-access library, which is the right place for it - an owner orphaning their own tables is a data-integrity mistake rather than an account reaching data it does not hold, and that second part is refused by the rules.

Rendering uses SVG rather than canvas: object counts are low, hit-testing and accessibility come for free, and it prints cleanly for QR sheets. Issue \#1087's printed codes are inline SVG for the last of those reasons: a vector code rasterises at the printer's resolution rather than the screen's, it is laid out before `window.print()` reads the page where an image may still be decoding, and a browser printing without background graphics drops an image's background while keeping an SVG `fill`.

Issue \#1082 built the surface. `libs/bite-tribe-business/floor-plan/ui` holds
the canvas and the geometry helpers around it; `.../floor-plan/page` holds the
editor page, its integration service and the room form. The split is enforced
rather than agreed: the `ui` library is tagged `type:ui`, and
`@nx/enforce-module-boundaries` forbids `type:ui` from importing
`type:data-access`, so the canvas is structurally unable to read or write a
room. It takes a `Room` and draws it.

The SVG `viewBox` **is** the viewport, expressed in room millimetres. Pan moves
its origin and zoom scales its extent, so one stored room renders identically at
any container size and on paper, and nothing in the canvas converts a millimetre
into a pixel to decide what to draw. Pixels enter in one place, turning a
pointer's travel into a pan, where the browser has already measured the element.
Line weights and the scale reference are sized as a share of the viewport, which
is what holds them at one width on screen across the zoom range: zooming in
halves the viewBox and doubles the pixels each millimetre is drawn with. The
viewport is component state and is stored nowhere - a `viewBox` in the room
document would mean two owners on two screens fighting over one scroll position.

Metres and millimetres meet in exactly two places, both in
`floor-plan-units.ts`: the room form, and the canvas's scale label. An owner
knows their room in metres and the model stores integer millimetres, so a
millimetre reaching an input or a metre reaching Firestore is the bug that
module exists to prevent.

Snapping is a decision about where the _next_ edit lands. Turning the grid on
never walks through a plan an owner already arranged, so nothing snaps on load.
In issue \#1082 the only coordinates an owner could enter were the room's own
dimensions; issue \#1083 put every placement, drag, nudge and resize through the
same `snapToGrid`.

The editor is the first reader of issue \#1081's `FloorPlanConflictError`. It
takes the stored room off the error rather than re-reading it - the read already
happened when the refusal was explained - and puts it on screen, so an owner who
lost the race is shown what is there instead of a failure they cannot act on. A
room deleted mid-save has no stored room to show, so the list is reloaded
instead.

The editor lives at `restaurant/:restaurantId/floor-plan` behind `authGuard`,
`roleGuard('business', 'staff')` and `ownedRestaurantGuard`. The last of those
checks `Restaurant.ownerUserId`, which a staff account never holds, so the
Permissions table above holds for a shared or bookmarked URL and not only for
the links.

Issue \#1083 put things in the room. The palette, the geometry of an edit and
the canvas's gestures are in the `ui` library; the layout being edited, its undo
history and the writes are in `page`. The split is the same one the tag enforces:
`floor-plan-geometry.ts` is pure functions over millimetres, so snapping,
clamping, resizing and rotation are asserted without rendering anything, and the
canvas turns a gesture into numbers and asks that module what they mean.

The canvas draws a `FloorPlanItem`, which is the geometry a wall and a table
genuinely share. The model keeps the two apart for good reasons and the editor
has the opposite problem: a selection holds whatever the owner shift-clicked, one
drag moves all of it, and one undo puts all of it back, so a canvas that branched
on "wall or table" would carry that branch through selection, snapping, resizing,
rotation and the history. The branch happens twice instead, on the way in and on
the way out.

**A gesture in flight is held by the canvas and nowhere else.** The dragged
selection is previewed as component state, the rest of the plan is untouched, and
the parent hears about the move exactly once, when the pointer is released - so
one gesture is one undo step and a drag does not write through the whole plan on
every pointer move. A press and release that never moved reports nothing at all,
because selecting is not a mutation.

**Undo stores snapshots rather than inverse operations.** Half of these
mutations are not invertible on their own: a resize snaps a side to the grid and
clamps it, a move is trimmed by the room's edge, and a delete has to put an
object back at a position it never recorded. Every inverse would have to be
written and kept in step with the forward path, and its failure mode is an undo
that lands an object a few millimetres out. A layout is a handful of small plain
objects, so fifty whole copies cost less than that bookkeeping. Selection, pan,
zoom, the grid spacing and the snap toggle are viewport state and are not in the
history.

**An object's centre stays inside the room.** That is the whole of "nothing may
be positioned entirely outside its room": a shape whose centre is on the floor
necessarily overlaps the floor. Clamping the _bounds_ instead would refuse to let
a bar counter overhang the wall it is built into, and a rotated object's bounds
grow as it turns, so a table would shove itself away from a wall as the owner
rotated it. A group is clamped as one rigid thing - the translation is trimmed so
every member stays on the floor - because clamping each centre separately would
let the item that hit the wall stop while the rest slid on, rearranging spacing
the owner built deliberately.

Issue \#1084 made the table an entity. The editor's table read moved from the
open room to the whole restaurant, because a label unique across rooms cannot be
checked against tables that were never loaded; the open room is filtered out of
that one query, so a plan load is still one room document plus one tables query
and switching rooms re-reads nothing. Geometry and identity stay on separate
paths that share no field, which is what makes "editing capacity never changes
geometry" a structural fact rather than a promise. See [[Table]] for the label
rule, the numbering helper and what the plan draws.

Snapping runs grid first and edges second. An owner pushing a table towards a
wall means the wall, and a grid line 40 mm short of it is not what they were
aiming at. The room's own walls are in the neighbour list like any other edge. A
resize snaps the _side_ rather than the dragged edge's position, because a
rotated item's edge does not lie on a room axis at all, and it works in the
item's own frame so a handle on a table standing at 30 degrees grows it along its
own length.

Every mutation has a keyboard path, which is what makes the palette place two
ways: dragging an entry on to the plan needs a pointer, so activating the entry
places the same object in the middle of the current view. Resize and rotation
have degree and metre inputs beside the canvas that go through the same code the
handles do.

Placing a table writes one table document and placing geometry writes only the
room document, which is issue \#1081's split doing its job. The room goes first
in a save because it is the one the version rule guards: a save that lost the
race is refused before any table is written.

Issue \#1085 made the plan a restaurant rather than a room. Four things changed
and one deliberately did not.

**A table moves rooms as an ordinary plan edit.** `roomId` is a field on the
table, so the move is one field change on the document a printed QR code, a
visit and an order already point at - which is the whole reason the table is not
a document under its room. It goes through the undo history and lands with the
same save as everything else, and the moved table stays in the edited layout
rather than being dropped from it: a table missing from the layout is
indistinguishable from a deleted one on the way to Firestore, and the save would
then delete the document the printed code resolves to. Its centre is clamped
into the target room, because a room-relative coordinate means something else in
a different room.

**Room order is stored and renumbered from position.** Moving a room reassigns
`order` from the new array position for every room whose position changed, and
writes only those, so a restaurant whose stored orders collide or leave gaps is
healed by the first move instead of sorting differently on the next read. The
writes are sequential rather than parallel, because each one carries issue
\#1081's version rule and a room that lost a race has to stop the reorder rather
than let the rest of the list land around it.

**A floor is a display grouping over the order, not a second ordering.** A group
is shown where its first room already stood, so naming a level groups the list
without reshuffling it, and clearing one does not either. Headings appear only
once a room names a level, because a single heading saying the rooms are on no
floor groups nothing.

**Capacity is derived, never stored.** The editor already holds every table of
the restaurant for issue \#1084's label rule, so the summary costs no read: the
stored tables of the rooms nobody has open, plus the _edited_ tables of the one
that is, which is what makes the numbers follow a table the owner placed or
moved a minute ago. Seats count only tables in service, because the number
answers how many guests can sit there.

**The editor is a desktop tool and no longer collapses.** It holds a minimum
width and scrolls sideways below it, rather than folding three columns into one.
The breakpoint that used to do that was the only media query in the whole
`libs/bite-tribe-business` tree, so the editor was the inconsistent surface
rather than the responsive one, and issue \#1547 had already baselined the
`Business/*` stories at `chrome.laptop` alone on the same grounds. Ionic's
`ion-content` ships `overflow-x: hidden`, so the minimum width needs `scrollX`
turned on with it; without that the right-hand column is clipped at a narrow
window with no way to reach it, which is worse than the collapse it replaces.

**The responsive promise is dead for the editor, and alive for the staff view.**
Issue \#1089 owned "responsive and accessible floor plan rendering" and has been
split: the accessibility half stays there, and the responsive half moved to
issue \#1093, the staff live view. The reason is a product one rather than a
technical one. A host greeting guests at the door has a tablet in one hand and
wants the published plan read-only with the operations of a service on it; an
owner laying out twenty tables to the millimetre is sitting at a desk. Those are
two surfaces with two gesture vocabularies, not one surface at two widths.

**The cards are arranged by what they describe, not by what they are.** The left
column carries the rooms, the open room's own fields and the selected table -
things that describe the restaurant and outlive any rearrangement. The right
column carries the palette, the canvas and the panels that act on a selection.
Under the canvas, one row holds whatever the selection calls for on the left and
the grid settings anchored on the right: the object panel and the numbering
helper can never both be present, since one needs exactly one item selected and
the other needs two or more, so they share a slot. The grid keeps its half in
every state including the empty one, because it is the only card always on
screen and a card that grew to full width and shrank again as the owner clicked
around would move the two controls they reach for most.

**What did not change is the reseeding rule.** Switching rooms, and a room whose
version moved, both reseed the editor from what is stored - so an unsaved plan
would be lost. Switching asks the owner first, and only when there is something
to lose; reordering closes its control instead, because a toast cannot ask a
question and a confirmation that appears every time is one nobody reads.

Issue \#1088 made the plan two states. Five decisions carry it, and one
deliberately reversed something issue \#1085 had decided.

**The draft is a whole room, not a patch.** It carries the room's name, its
level, its dimensions, its geometry and its tables, as values rather than as a
diff against what is published. A patch would have to be rebased every time
another device published, and the rebase of "this table moved 200 mm" against
"that table was deleted" is a conflict resolution nobody asked for. A layout is
a handful of small plain objects, so a whole copy costs less than the
bookkeeping - the same reasoning that made the undo history of issue \#1083
store snapshots rather than inverse operations.

It carries the tables in particular because they are otherwise documents of
their own. A table moved in a draft must not move in
`/restaurants/{restaurantId}/tables/{tableId}`, because that collection **is**
the published state a scanned QR code resolves against. A table the owner
placed in a draft therefore has no document at all until the plan is published,
which is also what keeps it out of QR token issuing.

**The draft counts separately from the room.** `Room.version` guards the
published plan and moves only when somebody publishes; the draft carries its own
`revision` and the rules apply the same successor rule to it. Sharing the
counter was the obvious alternative and is wrong: an autosave writes every few
seconds, every write would look like a publish to anything watching the version,
and the editor reseeds from a room whose version moved - so the owner's undo
history would empty itself while they worked.

**A refused draft write reseeds nothing.** The two refusals have two different
answers. A publish that lost a race shows the owner the room _as stored_,
because the published plan genuinely became something else and they have to see
it before overwriting it. An autosave that lost a race leaves everything exactly
where it is and stops writing: the arrangement on screen is the only copy of
itself, and throwing it away is precisely what autosave exists to prevent. The
owner is told a second device has the draft, and can publish theirs or discard
it.

**Validation blocks four things and warns about two.** An empty label, a
duplicate label, a capacity below one and a table whose centre is outside its
room are errors, because each is a state something downstream cannot recover
from: a sheet cannot print a table with no number, a scan cannot resolve one of
two tables called 12, and a table outside its room is not in the room staff are
told to look in. A table that overhangs the outline and two tables that overlap
are warnings, because those are a table against a wall and a party of ten - an
editor that refused them would be arguing with the room it describes.

The editor already refuses three of the four as they are typed, so the gate
exists for the plans that reached the state another way, and there are three
real ones: a room that was made smaller (resizing moves nothing standing in it),
a second device arranging a second room it cannot see, and a draft stored before
a rule existed. Each finding names a table and jumps to it, opening its room
first, because a finding an owner has to hunt for is a finding they publish
around.

**Publishing asks for the QR codes.** [[Table]] gives every enabled table an
active code, and until this issue the only thing that asked was the sheet page
of issue \#1087 - so a plan carried codes from the first time somebody opened
the printable sheet. Publishing is the moment the plan becomes real, so it is
the moment to ask. Issuing is idempotent, which is what lets both ask without
either invalidating what the other printed. A token failure does not fail the
publish: the plan is written by then, and unpublishing a correct plan because a
callable timed out would be the worse answer. The tables are re-read
afterwards, because `qrTokenId` is backend-owned and a later publish that wrote
them back without it would be refused by the rules.

**What issue \#1085 decided and this issue reversed.** Switching rooms asked
the owner first, and reordering the rooms was closed while the open room had
unsaved changes. Both existed because the editor reseeds from what is stored and
an unsaved arrangement was therefore lost. It no longer is: the editor stores
whatever is still inside the autosave's debounce window before it switches or
reorders, and then reseeds from the draft. The question and the block both
answered a problem that is gone, and a confirmation that protects nothing is one
that trains an owner to click through the next one.

Discarding a draft is now the only action in the editor that destroys work the
owner cannot get back, and it is the only one that asks. It also needs the
editor to be told explicitly to start again: the room is the same room at the
same version and its tables did not move, so nothing in the stored plan's
identity changes, and without a seed token the editor would go on showing the
arrangement that was just thrown away.

## Current Limitations

- A plan can be built but not described. Issue \#1083 shipped the palette, placement, move, resize, rotate, multi-select, duplicate, delete, snapping and undo, so an owner can lay out a real dining area. A table placed this way is a real document with a generated number and four seats, and nothing yet lets the owner change either, nor the shape or the enabled state (issue \#1084).
- A room that is resized still does not move what stands in it. Shrinking a room can leave an object outside its new outline, and the editor neither refuses it nor drags the geometry in. What issue \#1088 added is the consequence: a _table_ left outside now blocks the publish and says which one, so the plan cannot go live describing a table that is not in the room. Geometry is not validated at all - a wall half outside the room is a wall of the room.
- The rules are deployed by hand. `npx nx firebase-deploy-rules bite-tribe-firebase` has to run before the floor-plan rules mean anything in production; merging them changes nothing on its own. Since issue \#1086 that also covers the public read on `/tableTokens` and the backend-only `qrTokenId`, so an undeployed rules file leaves a scanned code unresolvable.
- Rotating a token still has no surface. `rotateTableQrToken` has existed since issue \#1086 and nothing calls it: replacing a code that was photographed is a different decision with a different consequence, and needs a confirmation of its own rather than a second button beside Print. Issuing is now asked for by two surfaces - the sheet page of issue \#1087 and the publish step of issue \#1088 - and because it is idempotent, neither invalidates what the other printed.
- A draft is per room, and publishing is per room. An owner rearranging a terrace and a dining room in one sitting publishes twice, and there is no "publish the whole restaurant". That follows the shape of the editor, which holds one room at a time; a restaurant-wide publish would have to validate and write rooms the owner has not looked at.
- The autosave's debounce window is the one thing that can still lose work, and only to a crash. A room switch, a reorder and a publish all store the draft first; nothing stores it when the browser is closed mid-gesture, so the last second and a half is what a power cut costs.
- A table moves out of the open room but never into it. Issue \#1085 moves a table by picking its new room in the table card, which is reachable only for a table the owner can see; there is no way to reach into another room and pull a table across, and no multi-room view to do it from.
- Reordering the rooms still reseeds the editor, and now reseeds it from the stored draft rather than from the published plan - which is why the control is no longer closed while the plan is unpublished (issue \#1088). What it still costs is the undo history of the open room.
- The canvas is baselined at desktop only, and now locked to it. `Business/*` stories are visually referenced at `chrome.laptop` alone, because the business app is a desktop product (issue \#1547), and since issue \#1085 the editor holds a 60rem minimum and scrolls sideways rather than collapsing. The `viewBox` still scales from the same stored data at any width, which is what the staff view of issue \#1093 will read it with. Accessibility hardening - keyboard paths, accessible names, greyscale, dark mode - is issue \#1089.
- No CAD import, no exact scale drawing, and no automatic layout.

## Future Ideas

- Capacity planning and turnover analysis derived from the plan
- Guest-facing room preview when choosing a table
- Reservation blocks drawn directly on the plan

## Sources Used

- [[Restaurant]]
- [[Table]]
- [[Table Visit]]
- [[Mission]]
- [[Principles]]
