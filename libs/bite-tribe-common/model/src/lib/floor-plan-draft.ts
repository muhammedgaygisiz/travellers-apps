import type { FloorPlanObject, FloorPlanSize } from './floor-plan';
import type { RestaurantTable } from './restaurant-table';

/**
 * A room as the owner is currently arranging it, before it is published
 * (GitHub issue #1088).
 *
 * ## Why a draft exists at all
 *
 * A floor plan is rearranged during a service. Tables are pushed together for
 * a party of ten, a section is closed for a private booking, the terrace is
 * laid out again for the summer. Until this type existed, every one of those
 * edits was live the moment it was saved: the plan staff read and the plan a
 * scanned QR code resolves against were whatever the owner had last written,
 * half-finished or not.
 *
 * So the room document is the *published* plan and this is the *draft*. The
 * owner edits the draft, it is autosaved as they work, and publishing is the
 * one deliberate action that makes it the room.
 *
 * ## Why it is a document of its own
 *
 * It is stored at
 * `/restaurants/{restaurantId}/rooms/{roomId}/drafts/current`, not as a field
 * of the room.
 *
 * A field would be read by everyone who reads the room, and security rules
 * cannot hide one field of a document from one reader. [[Floor Plan]] gives
 * staff a read of the *published* plan, so a draft living on the room document
 * would make "staff never see the draft" a promise the rules could not keep.
 * A separate document makes it a structural fact: the drafts subcollection has
 * its own match block, and staff are not in it.
 *
 * ## What it carries
 *
 * The whole editable room, not a patch against the published one. A patch
 * would have to be rebased every time another device published, and the
 * rebase of "this table moved 200 mm" against "that table was deleted" is a
 * conflict resolution nobody asked for. A whole copy is a handful of small
 * plain objects, and publishing it is a write of exactly what the owner sees.
 *
 * That includes the tables, which are otherwise documents of their own. A
 * table moved in a draft must not be moved in `/tables/{tableId}` yet, because
 * that collection *is* the published state that live surfaces read.
 */
export interface FloorPlanDraft {
  /** The room's name as the owner has it now, published or not. */
  name: string;
  /** The level the room sits on, absent when the owner named none. */
  floor?: string;
  /** The room's dimensions as the owner has them now. */
  size: FloorPlanSize;
  /** The geometry standing in the room. */
  objects: FloorPlanObject[];
  /**
   * The tables of the room, as whole entities rather than as geometry.
   *
   * A table the owner placed in the draft has no document under
   * `/tables/{tableId}` until the plan is published, which is what keeps an
   * unpublished table out of every live surface and out of QR token issuing.
   */
  tables: RestaurantTable[];
  /**
   * Optimistic concurrency for the draft, counted separately from the room.
   *
   * The room's `version` guards the published plan and moves only when
   * somebody publishes. A draft is written every few seconds by an autosave,
   * so sharing that counter would make every autosave look like a publish to
   * the editor, which reseeds from a room whose version moved and would throw
   * the owner's undo history away mid-edit.
   *
   * Two devices drafting one room still cannot silently overwrite each other:
   * a draft write carries the successor of the revision it read, and the rules
   * refuse anything else.
   */
  revision: number;
  /**
   * When the draft was last written, in epoch milliseconds.
   *
   * A number rather than a Firestore timestamp, because the only reader is the
   * editor telling the owner their work is stored, and a plain number crosses
   * the Capacitor Firestore bridge as itself on every platform.
   */
  updatedAt: number;
}
