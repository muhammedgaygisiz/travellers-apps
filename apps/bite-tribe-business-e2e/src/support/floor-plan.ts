import { Page } from '@playwright/test';
import {
  deleteFirestoreCollection,
  deleteFirestoreDocument,
  listFirestoreDocuments,
  seedFirestoreDocument,
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

/** One room of a seeded plan. */
export interface SeededRoom {
  id: string;
  name: string;
}

/** One table of a seeded plan. */
export interface SeededTable {
  id: string;
  label: string;
  roomId: string;
  seats: number;
}

export interface SeedPublishedPlanOptions {
  restaurantId: string;
  restaurantName: string;
  /** The account named on `Restaurant.ownerUserId`. */
  ownerUserId: string;
  rooms: readonly SeededRoom[];
  tables: readonly SeededTable[];
  position?: { latitude: number; longitude: number };
}

/** Roughly central Munich, the position the whole business suite pins. */
const DEFAULT_POSITION = { latitude: 48.137154, longitude: 11.576124 };

/**
 * A published plan: the restaurant, its rooms, and its tables.
 *
 * Written as documents rather than built in the editor, because the journeys
 * that read a plan need a room that already exists - reaching one is the editor
 * journey's subject. No table carries a `qrTokenId`: that field is
 * backend-owned and nothing here asks for one.
 *
 * Shared by the live-table journey and the staff-entry one (issue \#1097),
 * which need the same fixture for opposite reasons: one is about what the room
 * shows, the other about who is allowed to arrive at it.
 */
export const seedPublishedPlan = async (
  page: Page,
  {
    restaurantId,
    restaurantName,
    ownerUserId,
    rooms,
    tables,
    position = DEFAULT_POSITION,
  }: SeedPublishedPlanOptions,
): Promise<void> => {
  await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
    id: { stringValue: restaurantId },
    name: { stringValue: restaurantName },
    description: { stringValue: '' },
    ownerUserId: { stringValue: ownerUserId },
    claimStatus: { stringValue: 'claimed' },
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: position.latitude },
          longitude: { doubleValue: position.longitude },
        },
      },
    },
  });

  for (const [order, room] of rooms.entries()) {
    await seedFirestoreDocument(
      page,
      `restaurants/${restaurantId}/rooms/${room.id}`,
      {
        name: { stringValue: room.name },
        order: { integerValue: String(order) },
        version: { integerValue: '1' },
        objects: { arrayValue: {} },
        size: {
          mapValue: {
            fields: {
              width: { integerValue: '8000' },
              height: { integerValue: '6000' },
            },
          },
        },
      },
    );
  }

  for (const [index, table] of tables.entries()) {
    await seedFirestoreDocument(
      page,
      `restaurants/${restaurantId}/tables/${table.id}`,
      {
        label: { stringValue: table.label },
        roomId: { stringValue: table.roomId },
        shape: { stringValue: 'round' },
        diameter: { integerValue: '900' },
        seats: { integerValue: String(table.seats) },
        enabled: { booleanValue: true },
        rotation: { integerValue: '0' },
        position: {
          mapValue: {
            fields: {
              x: { integerValue: String(1500 + (index % 3) * 2500) },
              y: { integerValue: String(1500 + Math.floor(index / 3) * 2500) },
            },
          },
        },
      },
    );
  }
};
