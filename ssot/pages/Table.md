# Table

## Purpose

A Table is a seating place in a restaurant, represented as a business entity rather than as a shape on a plan.

BiteTribe must be able to state that a specific object is table 12, has four seats, and sits in the main dining room, and then attach availability, visits, orders, payments, and Bites to it.

## Why It Exists

The Table is the unit that connects the physical restaurant to everything digital that happens during a visit. A QR code identifies a Table. A visit happens at a Table. An order belongs to a visit at a Table. A Bite can eventually be traced back to it.

## Business Rules

- A Table belongs to exactly one Room of exactly one Restaurant.
- A Table has a public label or number that is unique within its Restaurant, including across rooms.
- A Table has a seating capacity of at least one.
- A Table can be enabled or disabled. A disabled Table stays in the plan and is not orderable.
- A Table can be moved between Rooms while keeping its identity, its label, and its QR token, so printed codes stay valid.
- Every enabled Table has exactly one active QR token.
- A QR token is opaque and non-guessable. It never encodes the table number.
- Rotating a QR token revokes the previous one and does not change the Table's identity or history.
- Live state is not part of the Table. It lives separately, so operational updates never rewrite the layout. See [[Table Visit]].
- Deleting a Table revokes its QR token and must not destroy historical visits or orders that reference it.

## Table State Versus Table Enablement

These two are different and must not be conflated.

| Concept                    | Meaning                                                  | Owner                               |
| -------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `enabled` on the Table     | The table is in service at all, a configuration decision | Restaurant owner, in the floor plan |
| `disabled` as a live state | The table is blocked right now, an operational decision  | Restaurant staff, in the live view  |

## Required Data

| Field       | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `id`        | Internal identifier, stable for the table's lifetime              |
| `label`     | Public table number or name shown to staff and guests             |
| `roomId`    | Owning room                                                       |
| `position`  | `{ x, y }` in room millimetres, centre of the table               |
| `shape`     | `rectangle` or `round`                                            |
| `size`      | `{ width, height }` in millimetres, on a `rectangle` table        |
| `diameter`  | Millimetres, on a `round` table, instead of `size`                |
| `rotation`  | Degrees clockwise                                                 |
| `seats`     | Seating capacity                                                  |
| `enabled`   | Whether the table is in service                                   |
| `qrTokenId` | Reference to the active opaque QR token, absent before publishing |

`size` and `diameter` are alternatives rather than both being optional: a round table has no width and height to disagree about, and allowing both would let a plan describe an ellipse no renderer has a rule for.

## Live Table State

Stored separately from the Table. Proposed states:

| State             | Meaning                                         |
| ----------------- | ----------------------------------------------- |
| `available`       | Free and ready                                  |
| `reserved`        | Held for an expected party                      |
| `occupied`        | A party is seated                               |
| `ordering`        | An order is in progress                         |
| `awaitingPayment` | The bill has been requested or is being settled |
| `cleaning`        | Being turned over                               |
| `disabled`        | Temporarily blocked                             |

Allowed transitions:

```text
available       -> reserved | occupied | cleaning | disabled
reserved        -> occupied | available | disabled
occupied        -> ordering | awaitingPayment | cleaning | available
ordering        -> awaitingPayment | occupied | cleaning
awaitingPayment -> cleaning | available
cleaning        -> available | disabled
disabled        -> available
```

A Table with no state document is treated as `available`. Every transition is applied by the backend, validated against this matrix, and recorded with actor and timestamp, so two staff members acting at once produce one outcome and a disputed table has a history.

## Relationships

```text
Restaurant
|-- Room
    |-- Table
        |-- Table state (live, separate document)
        |-- QR token
        |-- Table visits
            |-- Orders
```

## Lifecycle

```text
Owner places the table in the floor plan
|
Owner assigns label, capacity, and enabled state
|
Plan is published
|
QR token is generated and printed
|
Staff seat a party, opening a visit
|
Guest scans, joins the visit, and orders
|
Visit is paid and closed
|
Table returns to an available state
```

## Permissions

- Guest: resolve one Table through a valid QR token and see restaurant, room, and table label. No other table data.
- Restaurant staff: read tables, read and change live table state, open and close visits. No floor-plan writes.
- Restaurant owner: full configuration of tables, labels, capacities, enablement, and QR rotation.
- Admin: read for support. Configuring tables is restaurant maintenance, and `admin` does not imply `business` (issue \#1164), so a change goes through the assigned owner.

## Use Cases

- [[UC - Configure Restaurant Floor Plans And Tables]]
- [[UC - Order At The Table Through A QR Code]]

## Related Epics

- Issue \#1070 - Restaurant floor plan and table configuration
- Issue \#1071 - Staff table management and live table state
- Issue \#1072 - QR table menu and table ordering

## Technical Implementation

Firestore layout:

```text
/restaurants/{restaurantId}/tables/{tableId}
/restaurants/{restaurantId}/tableStates/{tableId}   planned, issue #1071
/tableTokens/{token}
```

`/tableTokens/{token}` is top-level and publicly readable so a scan resolves in a single read. It exposes only what a scan needs and is never client-writable.

The shared type is `RestaurantTable` in `libs/bite-tribe-common/model/src/lib/restaurant-table.ts`, added by issue \#1080. It is named for its restaurant rather than as `Table`, because `Table` is taken by the DOM library in every consumer. Per `RD-GL-4` that is a code identifier and not a competing domain term. It is a union discriminated on `shape`, and its geometry follows the coordinate system on [[Floor Plan]].

Issue \#1081 added the persistence. A table is one document per table rather than a subcollection of its room, because a table keeps its identity when it moves between rooms: `roomId` is a field, so a move is a field change rather than a delete and recreate of the document a QR token, visits, and orders point at. Tables carry no `version`: the concurrent edit that can silently lose work is the room geometry two devices each hold a whole copy of, while a table is one small document changed by one deliberate action. Writes go through `FloorPlanDataAccessService`, which stores the fields of the shape a table actually has, so switching a round table to a rectangle drops the diameter rather than leaving a document that describes two shapes.

Issue \#1083 made the editor the first writer. A table placed on the plan is given its id by the client rather than by Firestore, which is what lets it be dragged, duplicated and undone before it is ever saved: an id assigned on write would mean the editor holding an object it cannot name, and the undo history is keyed on ids. `saveTable` writes at that id, and the rules accept it because they authorise the account against the restaurant rather than the document name. A save writes only the tables whose fields actually differ from the ones that were read, compared field by field - a table read from Firestore and one built in the editor carry the same fields in a different order, so a serialised comparison would rewrite every table on every save.

Issue \#1084 made the table a business entity in the editor. The owner sets its label, its seating capacity, its shape and its enabled state in a card of its own, beside the geometry card rather than inside it - where a table stands is the drawing, and what it is called and how many people it seats are facts that outlive every rearrangement. The two are edited by separate paths that share no field, so dragging a table cannot rename it and renaming it cannot move it.

The uniqueness rule forced a read change. Issue \#1082 loaded the tables of the open room, because that is what the canvas draws; a label unique across the restaurant cannot be checked against tables that were never loaded, so the editor now reads every table of the restaurant and filters the open room out of it. That is still one query per plan load, bounded by one restaurant rather than by the business, and switching rooms re-reads nothing. A duplicate label is refused rather than warned about: the plan being edited never itself holds two tables called 12, and the refusal names the room that already has the number. Comparison is case-folded and trimmed, because staff say `A1` and `a1` identically and a printed sheet cannot carry the difference. Generated labels obey the same rule, so a table placed or duplicated in the terrace does not take a number the dining room is using.

Bulk numbering is an action over a selection rather than a field per table, because a room of twenty tables is built by duplicating one. It assigns consecutive _free_ numbers in reading order - top to bottom in bands about one table deep, then left to right - and skips numbers held elsewhere in the restaurant, so the helper cannot create the collision a single rename refuses. `loadTableByLabel` is the other half of the same rule: one `where` on `label` resolves "table 12" to one table, which is what a support request, a printed sheet and a scan resolution all start from.

The plan draws what the fields mean. A table carries its number in the middle and its capacity under it, behind a seated figure - a pictograph rather than the word, because a 900 mm round table is about three characters wide at zoom-to-fit and the figure is what stops two numbers on one table being ambiguous. The words are in the SVG `<title>`, where a hover and a screen reader both find them. A disabled table is hatched rather than faded: a fade reads as "loading" and vanishes in the print a QR sheet is made from.

Issue \#1085 made the move real. The owner picks the table's room in the same
card that holds its number and its capacity, and the table keeps its `id`, its
`label` and its `qrTokenId` - so a code already printed and stuck to the table
still resolves to it. The move is an ordinary plan edit rather than an immediate
write: it goes through the undo history and lands with the save the owner
presses once, and the moved table stays in the edited layout instead of being
dropped from it, because a table missing from the layout is indistinguishable
from a deleted one and the save would delete the very document the printed code
points at. Its centre is clamped into the target room, since a room-relative
coordinate means something else in a room of a different size.

Issue \#1086 issued the tokens. A token is 130 bits from the system CSPRNG
rendered in Crockford base32, and the generator takes no argument at all - which
is how "cannot be derived from a table number" is delivered, rather than by a
rule somebody has to keep obeying. Uppercase alphanumeric so a QR code encodes
it in alphanumeric mode instead of byte mode, and without `I`, `L`, `O` or `U`
so a code read aloud during a support call has no confusable pair.

The document is read by `get` and never by `list`. That is the enumeration
defence: whoever holds a printed code can read what it resolves to, and nobody
can walk the set, so a restaurant's table count and its live codes stay
unavailable to an account that was never given one. It is also the one thing in
the database an unauthenticated client may read, because a guest scanning a code
has no account yet and the scan is what establishes which restaurant they would
be signing in to.

A token document is never deleted. Rotating marks the old one `superseded` and
names its successor; deleting the table marks it `revoked`. Deleting the
document instead would make a retired table's sticker indistinguishable from a
code that was never issued, and those need different answers on screen. `active`,
`superseded` and `revoked` are therefore three states rather than two: a guest
holding an old sheet is told the code was replaced, and support can see the
table was reprinted rather than retired.

The token copies `roomId`, `label` and `enabled` from the table, and
`syncTableQrTokenOnTableWrite` keeps the copy true. A table keeps its token when
it moves room or is renamed, which is what makes a code already stuck to it keep
working - so a token holding only `tableId` would resolve in one read and then
need a second one, against a collection a guest may not read at all, to say
where the guest is sitting. Mirroring `enabled` is what lets a table taken out of
service after its sheet was printed resolve to "not in service" rather than to
nothing; refusing the order is issue \#1072.

Issuing is idempotent, and that is the point rather than a nicety: the publish
step of issue \#1088 and the sheet page of issue \#1087 both ask for tokens, and
a second call that minted new ones would invalidate every sheet already printed.
The token and the table's `qrTokenId` are written in one transaction, because a
table pointing at a token that was never written resolves to nothing and a token
nothing points at can never be rotated - rotation finds the current token
through the table.

Issue \#1087 printed them, and in doing so fixed the address every code carries:
`https://bitetribe.app/t/{token}`, built in
`libs/bite-tribe-business/floor-plan/ui/src/lib/table-qr-code.ts`. The origin is
`BITE_TRIBE_ORIGIN` in `libs/common/utils`, the same constant the consumer shell
canonicalises search-engine URLs against, because a second copy that drifted
would retire a room full of stickers nobody can correct. The path is two
characters because every character costs modules and every module costs printed
millimetres. Nothing serves it yet; issue \#1072 mounts the resolver there, and
a sticker printed today is what commits it to.

The code is drawn as two QR segments rather than one, which is where the
Crockford base32 alphabet pays for itself: a byte segment for the origin and an
alphanumeric segment for the token costs 143 bits where 26 bytes would cost 208,
and the 52 bits saved after the second segment's header are what fit error
correction level `Q` into QR version 4 instead of version 5. A token outside the
alphanumeric set falls back to one byte segment and simply prints larger, so the
saving is an optimisation rather than a rule the generator has to keep obeying.

The encoding itself comes from `qrcode-generator`, the workspace's only new
runtime dependency for this: MIT, no dependencies of its own, and about 15 kB.
Hand-rolling it would mean Reed-Solomon, mask selection and BCH format
information, where a subtle bug does not throw - it prints a room full of
stickers that no camera reads, and the cost of finding out is physical. The
package publishes both a CommonJS and an ES build behind `export =`, and this
workspace compiles the file under two tsconfigs that disagree about
`esModuleInterop`, so `table-qr-code.ts` takes the default export when there is
one and the namespace itself when there is not. It lands in the lazy chunk
behind the floor-plan route; neither app's initial bundle carries it.

A sheet is one DOM tree relaid by a print stylesheet rather than a second
document, so `Ctrl`/`Cmd`+`P` produces exactly what the Print button produces.
Two shapes: a sticker at 38 mm across, twelve to an A4 sheet, read at arm's
length by someone already reaching for it; and a tent at 80 mm, one per page,
read from a seated 600 to 700 mm without leaning in. A phone resolves a QR code
from roughly ten times its own width, which is the whole of why there are two
sizes rather than one compromise. Each code prints the table number largest, the
room and the restaurant under it, and the token itself in small monospace - for
the support call where somebody is holding the sticker and the camera is the
thing that is broken.

The sheet asks for tokens as part of loading, without a button, and takes each
token off that call rather than off the table document it just read - issuing
writes `qrTokenId`, so the tables read a moment earlier are stale for exactly
the tables that matter. Reprinting one table selects it and prints it; nothing
on the page rotates, so the codes already stuck to the other tables are
untouched.

## Current Limitations

- Uniqueness is held by the client, not by the database. Security rules cannot query, so no rule can ask whether a label is already taken; the editor refuses a duplicate and the publish validation of issue \#1088 refuses a plan that reached that state another way. A second device editing a second room at the same moment can still produce two tables with one number, because neither editor sees the other's unsaved plan.
- A table moves out of the room the owner is looking at, never into it. The control is on the selected table's card, so it is reachable only for a table on the open canvas; there is no way to reach into another room and pull a table across (issue \#1085).
- `enabled` decides whether a table gets a code and nothing else yet. A disabled table is skipped when a plan is issued tokens and refused when it is named, and one disabled after its code was printed resolves to "not in service" - but nothing reads that answer, because refusing the order is issue \#1072.
- `rotateTableQrToken` still has no caller. Issue \#1087 reaches `issueTableQrTokens` from the sheet page, and deliberately not the rotation beside it: the sheet is where a code is printed, and replacing a code that was photographed is a different decision with a different consequence, which needs a confirmation and a surface of its own rather than a second button next to Print.
- An editor holding a plan from before a token was issued cannot save that table. The rules compare `qrTokenId` by value, so a client writing back the value it read is fine and a client writing back the _absence_ of a token the backend has since written is refused. The sheet page issues tokens, so an editor left open while somebody prints in another tab can reach it; the editor's QR-code button is closed while the plan holds unsaved changes, which keeps the ordinary path clear of it, and the answer to the rest is the reseed the editor already does for a room whose version moved.
- Revocation follows a delete and nothing else. There is no "kill this code now" action that keeps the table: the paths are rotating it, which prints a new one, and deleting the table, which ends it.
- A printed sheet points at a URL nothing answers. `/t/{token}` is fixed and encoded into every code, and the page behind it is issue \#1072. A guest scanning a sticker printed today reaches the consumer app's own not-found handling rather than a table context.
- A QR code identifies a table context. It does not prove that the guest is physically present, and no design should assume otherwise.
- Presence hardening such as rotating codes, staff confirmation, and session expiry is planned in issue \#1107, not guaranteed by the token itself.

## Future Ideas

- Reservation holds on specific tables
- Table merge and split for large parties
- Turnover and occupancy analytics per table

## Sources Used

- [[Floor Plan]]
- [[Table Visit]]
- [[Restaurant]]
