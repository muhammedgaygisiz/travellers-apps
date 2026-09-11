import { FloorPlanDraft, Room } from 'model';

/**
 * A save that lost the race against another device (GitHub issue #1081).
 *
 * Thrown by `FloorPlanDataAccessService.saveRoom` when the room in Firestore
 * has moved past the version the caller read. It is a distinct type rather
 * than a flag on a generic error because the two outcomes need two different
 * offers from the UI: an authorisation failure means *you may not do this*,
 * while a conflict means *somebody already did something else* and the honest
 * answer is to show what is stored and let the owner decide.
 *
 * `currentRoom` is the room as it is stored now, carried on the error so the
 * caller does not have to read it again to render that choice. It is absent
 * only when the room was deleted while the save was in flight.
 */
export class FloorPlanConflictError extends Error {
  override readonly name = 'FloorPlanConflictError';

  constructor(
    readonly roomId: string,
    /** The version the rejected save was based on. */
    readonly baseVersion: number,
    /** The room as stored now, or `undefined` when it was deleted. */
    readonly currentRoom: Room | undefined,
  ) {
    super(
      `Room ${roomId} was saved from version ${baseVersion}, but the stored version is ${
        currentRoom ? currentRoom.version : 'gone'
      }.`,
    );
  }
}

/**
 * A room deletion refused because tables still stand in it.
 *
 * [[Floor Plan]] says a room cannot be deleted while it contains tables, and
 * the reason is that a table is a business entity: it carries a label staff
 * say out loud, a printed QR token, and visits and orders that point at it.
 * Deleting the room around it would leave those documents referring to a
 * `roomId` that resolves to nothing.
 *
 * Enforced here rather than in `firestore.rules`, because security rules
 * cannot query: a rule can read one named document, so it can never ask
 * whether a collection is empty. The rules therefore allow the owner to
 * delete their own room, and this check is what stops the app doing it by
 * accident. That is the right place for it - an owner orphaning their own
 * tables is a data-integrity mistake, not somebody reaching data they do not
 * hold, and the rules still refuse every account that does not hold the
 * restaurant.
 */
export class RoomNotEmptyError extends Error {
  override readonly name = 'RoomNotEmptyError';

  constructor(
    readonly roomId: string,
    /** How many tables still name this room. */
    readonly tableCount: number,
  ) {
    super(
      `Room ${roomId} still contains ${tableCount} table(s). Move or delete them first.`,
    );
  }
}

/**
 * A draft write that lost the race against another device
 * (GitHub issue #1088).
 *
 * The draft has its own counter and therefore its own conflict. Thrown by
 * `FloorPlanDataAccessService.saveDraft` when the stored draft has moved past
 * the revision the caller read, which happens when a second device is
 * arranging the same room.
 *
 * It is deliberately *not* answered the way {@link FloorPlanConflictError} is.
 * A publish that lost a race is shown the stored room, because the published
 * plan genuinely became something else and the owner has to see it before
 * overwriting it. An autosave that lost a race must not reseed anything: the
 * arrangement on screen is the only copy of itself, and throwing it away is
 * precisely what autosave exists to prevent. The editor stops autosaving and
 * says so instead.
 *
 * `currentDraft` is the draft as stored now, carried on the error so a caller
 * that does want to show it has not got to read it again. It is absent when
 * the other device discarded the draft rather than writing one.
 */
export class FloorPlanDraftConflictError extends Error {
  override readonly name = 'FloorPlanDraftConflictError';

  constructor(
    readonly roomId: string,
    /** The revision the rejected draft write was based on. */
    readonly baseRevision: number,
    /** The draft as stored now, or `undefined` when it was discarded. */
    readonly currentDraft: FloorPlanDraft | undefined,
  ) {
    super(
      `The draft of room ${roomId} was written from revision ${baseRevision}, but the stored revision is ${
        currentDraft ? currentDraft.revision : 'gone'
      }.`,
    );
  }
}
