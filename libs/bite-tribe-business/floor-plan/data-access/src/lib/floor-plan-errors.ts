import { Room } from 'model';

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
