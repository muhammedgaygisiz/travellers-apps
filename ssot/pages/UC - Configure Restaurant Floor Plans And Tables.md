# UC - Configure Restaurant Floor Plans And Tables

## Status

**Level:** L1

Implemented. Specified through issue \#1070 as stage 1 of issue \#735, and
every step of the planned flow below is now built, accessible (issue \#1089)
and covered (issue \#1090).

An owner can reach the editor, build the room and describe its tables:
`restaurant/:restaurantId/floor-plan` in the business app creates, renames,
resizes and deletes rooms, and draws one of them on a millimetre-accurate canvas
with a grid, pan, zoom and a scale reference (issue \#1082). Issue \#1083 put
the furniture in it: a palette of nine objects, drag or keyboard placement, move,
resize, rotate, multi-select, duplicate, delete, snapping to the grid and to
adjacent edges, and an undo history over all of it.

Issue \#1084 made a table a business entity rather than a rectangle. The owner
sets its public number, its seating capacity, its shape and whether it is in
service, and the number is unique across the whole restaurant rather than the
open room: the editor reads every table of the restaurant, refuses a label
another one already holds and names the room that holds it. A selection can be
numbered consecutively in one action, and the plan draws each table's number
with its capacity under it.

Issue \#1085 made the plan a restaurant rather than a room. The switcher orders
the rooms, groups them by an optional floor name, and shows what each one holds;
a table moves to another room from its own card and keeps its number and its QR
token when it goes; and the plan is summarised for the restaurant as a whole.

Issue \#1086 built the QR tokens, backend only. A table gets an opaque,
non-guessable code that resolves in one public read to its restaurant, room and
number; rotating one supersedes the code it replaces instead of erasing it, and
deleting a table revokes its code rather than leaving a sticker that resolves to
nothing.

Issue \#1087 put them on paper, and is the first caller of those callables.
`restaurant/:restaurantId/floor-plan/qr-codes` asks for the tokens as it loads,
draws one code per table in service, and lays them out as the A4 pages they
will print as - twelve stickers to a sheet, or one large tent card per page.
The owner filters by room and ticks
individual tables, which is how a single replacement is reprinted; nothing on
the page rotates, so every other table keeps the code already stuck to it. A
print stylesheet takes the app's header, its controls and Ionic's own scroll
container out of the way, so what leaves the printer is black codes on white
paper and the three lines of text beside each one.

Issue \#1088 made the plan two states. Nothing an owner does in the editor is
live any more: every edit goes into a draft that is stored as they work, and
publishing is the one deliberate action that makes it the room staff and a
scanned code read. It is refused while the plan carries a blocking error, each
finding names its table and jumps to it, and discarding returns the room to the
published plan. Staff got their read of that published plan in the same issue,
scoped to the one restaurant they work at.

Issue \#1090 locked the behaviour down before stage 2 builds on it. The
geometry, the table rules, the validation and the draft/publish state machine
are unit-covered as the pure functions they were written as, every reusable
editor component has its Storybook states including the QR code renderer's two
print sizes, and two Playwright journeys run the editor as an owner does:
`floor-plan-editor.spec.ts` builds a room, places and numbers two tables,
publishes and reloads, and `table-qr-codes.spec.ts` prints their codes. Both
assert the stored room, table and `/tableTokens` documents rather than a
picture of the editor, because a plan that renders correctly and stores nothing
is the failure that matters here. What stays on the unit tests is listed in
[[Current State - E2E Coverage]].

The page a scan lands on is still specification: \#1087 fixed the address at
`https://bitetribe.app/t/{token}` because a sticker cannot be corrected
afterwards, and issue \#1072 is what answers it.

No longer blocked. [[UC - Own And Claim Restaurants]] was the prerequisite,
because floor-plan data is restaurant-scoped and could not be trusted while the
Firestore rules allowed every authenticated user to write every document; issue
\#1078 replaced those rules and issue \#1081 scoped the room and table
collections to the account holding the restaurant. Those rules are deployed by
hand, so production is only bound once
`npx nx firebase-deploy-rules bite-tribe-firebase` has run.

## Goal

A restaurant owner digitally recreates the dining area well enough that staff and guests recognise it, and that every table becomes an addressable business entity.

This is not a construction plan. It is a practical, easy-to-maintain top-down representation.

## Actors

- Restaurant owner

## Planned Flow

Every step is implemented. Issue \#1088 built step seven, and publishing asks
for the tokens of step eight as it lands - so an owner now reaches the sheet of
step nine from a plan that already carries codes, rather than from a page that
had to ask for them itself. It still asks, because issuing is idempotent and
neither ask invalidates what the other printed.

- Owner opens the floor-plan editor for a restaurant they own.
- Owner creates a room and sets its width and height in metres.
- Owner places geometry: walls, doors, counters, bar areas, blocked areas, chairs, decoration.
- Owner places tables, then moves, resizes, rotates, duplicates, and deletes them.
- Owner assigns each table a public label, a seating capacity, and an enabled state.
- Owner adds further rooms or floors and can move a table between rooms without changing its identity.
- Owner validates the plan and publishes it.
- The system generates an opaque QR token for every enabled table.
- Owner prints QR sheets, as table tents or as a sticker grid, and places them in the room.

## Key Behaviours

- Coordinates are stored in room-relative integer millimetres, so the same stored plan renders consistently wherever it is drawn. The editor's SVG `viewBox` is in those same millimetres, and the owner types metres: the conversion happens at the form boundary and in the canvas's scale label, and nowhere else. Rendering the plan on a phone is what the staff live view does with that data, not what this editor does.
- The editor is a desktop tool and does not collapse. It holds a minimum width and scrolls sideways below it, because a millimetre-accurate drag surface folded into one column is a reading order nobody designed. See [[UC - Manage Tables During Service]] for the small-screen surface: a host at the door wants the plan read-only with a service's operations on it, which is a different screen rather than a narrower one.
- The cards are arranged by what they describe. What the restaurant _is_ runs down the left: its rooms, the open room's fields, the selected table. What the owner _does_ to it runs down the right: the palette, the canvas, and one row under it holding whatever the selection calls for beside the grid settings, which stay put so the controls reached for most never move.
- Pan, zoom and the grid are viewport state and are stored nowhere. Moving over a plan changes no stored field, and turning snapping on decides where the next measurement lands rather than moving anything already drawn.
- A save that lost a race against another device shows the room as it is stored, not a failure message. See [[Floor Plan]].
- The plan is structured data. Every object stays individually identifiable and editable. It is never stored as an image.
- An object's centre stays inside its room, so nothing can be dragged off the plan and lost, while a bar counter can still overhang the wall it is built into.
- A gesture is one undo step. What is on screen mid-drag is a preview the editor holds; the plan is written once, when the pointer is released.
- Every mutation is reachable from the keyboard alone, which is why a palette entry can be activated as well as dragged.
- A table's number is unique across the restaurant, not the room. The editor holds every table of the restaurant and refuses a duplicate label outright, naming the room that already has it, so the plan being edited can never itself contain two tables called 12. Case and surrounding spaces do not make a second number: staff say `A1` and `a1` identically and a printed sheet cannot carry the difference.
- Geometry and identity are edited by different paths and neither touches the other. Dragging a table cannot rename it, and renaming it cannot move it.
- A table taken out of service stays on the plan and is drawn differently. It is a real place in the room that is not taking guests, so hiding it would leave the owner rearranging around something they cannot see.
- Numbering is an action over a selection rather than a field per table, because a room of twenty tables is built by duplicating one. It runs in reading order and skips numbers held elsewhere in the restaurant, so it cannot create the collision a single rename refuses.
- A table moves between rooms without becoming a different table. Its identity, its number and its QR token all survive, so a code already printed and stuck to the table keeps resolving to it. That is what makes `roomId` a field rather than the table being a document under its room, and the move is an ordinary plan edit that the owner can undo and that lands with the save they press once.
- Room order is a decision the owner makes and the system stores, so the list reads the same after a reload. A floor name groups the rooms for display without reordering them, and a group appears where its first room already stood - naming a level never reshuffles a plan somebody arranged.
- Each room says how many tables it holds and how many guests it seats, and the restaurant says the same across all of them. The numbers are derived from the tables the editor already holds rather than stored, so they follow a table that was placed or moved a minute ago, and seats count only the tables in service.
- No arrangement is discarded without the owner saying so, and since issue \#1088 almost nothing can be. The plan is stored as a draft while the owner works, so closing the browser mid-edit and coming back opens on what they left. Opening another room and reordering the rooms both store the draft first and then reseed from it, which is why neither asks any longer: the question issue \#1085 put there protected an arrangement that can no longer be lost, and a confirmation that protects nothing trains an owner to click through the next one. Discarding the draft is the one action that destroys work, and it is the one that asks.
- Draft and published states are separate, so rearranging during service does not affect the live view. The separation is structural rather than promised: the draft is a document of its own, and a table placed in a draft has no table document at all until the plan is published.
- Publishing is blocked by a missing table number, duplicate table numbers, a capacity below one, or a table whose centre is outside its room. Overlapping tables and a table overhanging the room outline warn but do not block, because real rooms have odd arrangements. The editor already refuses three of the four as they are typed; the publish gate catches a plan that reached that state another way - a room that was made smaller, or a second device arranging a room this one cannot see.
- A finding names its table and jumps to it, opening the table's room first when it is not the one on screen. A finding an owner has to hunt for is a finding they publish around.
- Publishing is what asks for the QR codes. Until issue \#1088 the only thing that asked was the printable sheet, so a plan carried codes from the first time somebody opened it; the codes now exist from the moment the plan goes live. A failure to issue them does not unpublish a correct plan.
- An owner whose draft is refused keeps what is on screen. A second device arranging the same room stops this one's autosave rather than replacing the arrangement with theirs - the opposite of what a refused publish does, and for the opposite reason: a published plan that moved is something the owner has to see, while an unpublished arrangement is the only copy of itself.
- A table's QR code says which table it is and nothing about which table it is. The code carries 130 random bits and no part of the number printed beside it, so holding the sheet from table 11 tells a guest nothing about the code on table 12. It is read one document at a time and the collection cannot be listed, so the set of a restaurant's live codes is not something an account can collect.
- A code outlives the table's arrangement and not the table. It survives a move to another room, a rename and being taken out of service, because a sticker already on a table cannot be reprinted every time the plan changes; it is superseded when the owner deliberately replaces it, and revoked when the table is deleted. Both leave a code that still resolves, to "this was replaced" and "this is no longer valid" rather than to nothing - a scan that finds no document at all would be the answer to a code BiteTribe never issued, which is a different thing to tell a guest.
- Asking for codes twice gives the same codes. Publishing a plan and opening the sheet both ask, and a second ask that minted new tokens would invalidate every sheet already printed. That is what lets the sheet page ask as it loads rather than behind a button an owner has to be told is safe to press.
- A printed code is a physical object and is designed as one. A phone resolves a QR code from roughly ten times its own width, so the sticker on the table is 38 mm and read at arm's length, while the tent card standing on it is 80 mm and read from a seated 600 to 700 mm. One size for both would be too small to read across the table or too large to put twelve on a sheet.
- A person holding a printed code can tell which table it is without scanning it, and the layout says which fact matters most: the table number is the largest thing on the sheet, the room and the restaurant are under it, and the token itself is in small monospace for the support call where the camera is what is broken.
- What goes on paper is what is on screen, down to the page. The preview draws real A4 pages at 210 mm by 297 mm with the print margin as padding, splits the selection across them, and hands the same boxes to the printer as the page breaks - so an owner feeding label paper knows it is two sheets before they load it, and the preview and the paper cannot disagree about where a page ends. `Ctrl`/`Cmd`+`P` gives exactly what the Print button gives, because there is one set of elements rather than two documents. The codes are drawn in literal black on white rather than in theme colours: this is the one surface in the app that must ignore dark mode, because a scanner needs the contrast and an inverted code scans as nothing.
- A sheet is printed and thrown away; the plan outlives it. Which layout, which room and which tables are selected are viewport state stored nowhere, in the same way pan, zoom and the grid are.
- Printing is closed while the plan has unpublished changes. A table placed a minute ago is in the draft and has no document, so it has no token, and a sheet printed then would be missing exactly the tables the owner has just added.
- Editing the plan never writes live table state.

## Success Criteria

- An owner can build a two-room plan with at least twenty tables and reload it identically.
- A printed code scans from a normal seated distance with an ordinary phone camera, and the print output carries no navigation, no buttons and no dark-mode artefacts.
- Reprinting one table's code leaves every other table's code untouched.
- Table 12 is retrievable as a business entity with its room, capacity, and position, without parsing an image.
- Every enabled table has exactly one active QR token, and tokens are not derivable from the table number.
- A plan carrying a blocking error cannot be published, and an owner who closes the browser mid-edit returns to the arrangement they left.
- Staff and a scanned QR code read the published plan and never the draft.
- A guest with no BiteTribe account resolves a scanned code in one read, and a replaced or revoked code tells them so rather than failing.
- A printed QR sheet is legible and identifies restaurant, room, and table in human-readable text next to the code.

## Supported Evidence

Implemented:

- `libs/bite-tribe-common/model` room, table, and floor-plan-object types
- `libs/bite-tribe-business/floor-plan/data-access` load, save, the draft document, conflict signalling
- `libs/bite-tribe-business/floor-plan/ui` the canvas, the grid, the metre/millimetre conversion, the object palette, the edit geometry, the shape conversion, and the QR code renderer
- `libs/bite-tribe-business/floor-plan/page` the editor page, its workflow, the label rule, the bulk numbering, the autosaved draft, the publish validation and change summary, and the printable sheet with its print stylesheet
- `libs/common/utils` `BITE_TRIBE_ORIGIN`, the one origin a printed code and the consumer app's canonical URL share
- `libs/bite-tribe-business/shell` the `restaurant/:restaurantId/floor-plan` and `.../qr-codes` routes and their owner gate
- `apps/bite-tribe-firebase/firestore.rules` room and table scoping, the version rule, the draft's own revision rule, the staff read of the published plan, the backend-only `qrTokenId`, and the public `get` on `/tableTokens`
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/table-qr-tokens.ts` the token generator and the issue and rotate callables
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/sync-table-qr-token-on-table-write.ts` the mirror and the revocation on delete
- `/restaurants/{restaurantId}/rooms/{roomId}`, `/restaurants/{restaurantId}/rooms/{roomId}/drafts/current`, `/restaurants/{restaurantId}/tables/{tableId}` and `/tableTokens/{token}`
- `apps/bite-tribe-business-e2e/src/tests/floor-plan-editor.spec.ts` the build, publish and reload journey, and `.../table-qr-codes.spec.ts` the printable-sheet journey, both against the stored documents

Still planned:

- The page a scanned code lands on, and the staff live view that reads the published plan

## Related GitHub Scope

- Issue \#735 - Restaurant Interaction Platform umbrella
- Issue \#1070 - Restaurant floor plan and table configuration, with eleven child issues
- Issue \#1069 - Restaurant ownership, claiming and authorization, prerequisite, delivered
- Issue \#1080 - the shared model and the coordinate system, delivered
- Issue \#1081 - persistence, rules and optimistic concurrency, delivered
- Issue \#1082 - the editor canvas, rooms and the grid, delivered
- Issue \#1083 - placing, moving, resizing and rotating floor-plan objects, delivered
- Issue \#1084 - table properties, label uniqueness, numbering and capacity, delivered
- Issue \#1085 - multiple rooms and floors, room order, cross-room table moves, capacity summaries and the desktop-locked layout, delivered
- Issue \#1086 - opaque table QR tokens, their lifecycle and the rules that keep them backend-owned, delivered as backend only
- Issue \#1087 - printable table QR sheets, the first caller of those callables, delivered
- Issue \#1088 - the draft/published split, the autosaved draft, the publish validation and the staff read of the published plan, delivered
- Issue \#1089 - accessibility of the editor, delivered; its responsive half was moved to issue \#1093 rather than deferred
- Issue \#1090 - the unit, Storybook and Playwright coverage that closes the epic, delivered
- Issue \#1093 - the staff live view, which owns the small-screen and touch rendering of a published plan

## Related Domains

- [[Floor Plan]]
- [[Table]]
- [[Restaurant]]
