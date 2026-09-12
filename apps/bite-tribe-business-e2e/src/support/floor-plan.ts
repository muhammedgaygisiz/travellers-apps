import { Page } from '@playwright/test';
import {
  deleteFirestoreCollection,
  deleteFirestoreDocument,
  listFirestoreDocuments,
} from './firestore';

/**
 * Removes one restaurant's whole floor plan, and the restaurant with it.
 *
 * A plan is four collections on three levels and one top-level one, and none
 * of them goes away with the document above it: the room, the draft under the
 * room, the restaurant's tables, and the `/tableTokens` entries the backend
 * minted for those tables. The emulator keeps every write for the whole run,
 * and `/tableTokens` is shared by every restaurant, so a journey that left its
 * codes behind would leave them in the collection the next journey reads.
 *
 * The tokens are read off the tables rather than remembered from what a
 * journey asserted, which is the difference between cleaning up after a run
 * that passed and cleaning up after any run at all: an assertion that fails
 * between the mint and the assertion of it would otherwise strand the codes.
 *
 * Deleting the tables first lets the revocation trigger of issue \#1086 find
 * the tokens it ends, and the tokens are deleted afterwards regardless -
 * revoking a token is an `update`, so a document this has already removed
 * stays removed rather than coming back.
 */
export const deleteFloorPlan = async (
  page: Page,
  restaurantId: string,
): Promise<void> => {
  const tablesPath = `restaurants/${restaurantId}/tables`;
  const roomsPath = `restaurants/${restaurantId}/rooms`;

  const tokens = (await listFirestoreDocuments(page, tablesPath))
    .map((table) => table.fields['qrTokenId'])
    .filter((token): token is string => typeof token === 'string');

  const rooms = await listFirestoreDocuments(page, roomsPath);

  for (const room of rooms) {
    await deleteFirestoreCollection(page, `${roomsPath}/${room.id}/drafts`);
  }

  await deleteFirestoreCollection(page, tablesPath);
  await deleteFirestoreCollection(page, roomsPath);
  await deleteFirestoreDocument(page, `restaurants/${restaurantId}`);

  for (const token of tokens) {
    await deleteFirestoreDocument(page, `tableTokens/${token}`);
  }
};
