import { expect, Page, test } from '@playwright/test';
import { TablePlanPage } from '../pages/table-plan.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  deleteFirestoreCollection,
  seedFirestoreDocument,
} from '../support/firestore';
import { deleteFloorPlan, seedPublishedPlan } from '../support/floor-plan';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

const DINING = { id: 'dining-room', name: 'Main dining room' } as const;
const TERRACE = { id: 'terrace', name: 'Terrace' } as const;

/**
 * A published plan of five tables, four inside and one on the terrace.
 *
 * Five rather than two, because what this journey is about is a *room* read at
 * a glance: the summary has to add up, and a state belonging to the other room
 * must not be counted into this one.
 */
const TABLES = [
  { id: 'table-1', label: '1', roomId: DINING.id, seats: 4 },
  { id: 'table-2', label: '2', roomId: DINING.id, seats: 2 },
  { id: 'table-3', label: '3', roomId: DINING.id, seats: 6 },
  { id: 'table-4', label: '4', roomId: DINING.id, seats: 4 },
  { id: 'table-9', label: '9', roomId: TERRACE.id, seats: 4 },
] as const;

/** Long enough ago that the drawn duration is a whole number of minutes. */
const TWENTY_TWO_MINUTES_MS = 22 * 60_000;

/**
 * Reading the room during service:
 * [[UC - Manage Tables During Service]], issue \#1093.
 *
 * The plan is seeded as published rather than built through the editor. The
 * build journey is `floor-plan-editor.spec.ts`, and what this one is about
 * starts where that one ends: a room that exists, and what the people on shift
 * see happening in it.
 *
 * Two things here are worth more than the rest. A table with **no** state
 * document reads as free, which is the ordinary case for a restaurant opening
 * this screen for the first time and the one a count taken from the state
 * documents would get wrong. And a state written by something that is not this
 * browser appears without anything being asked for again - the acceptance
 * criterion the whole surface turns on, and the only part of it a unit test
 * cannot reach, because it is the Firestore listener rather than the signal
 * graph above it.
 *
 * The state is written straight to the emulator rather than through the app.
 * That is not a shortcut: `firestore.rules` refuses every client write to
 * `tableStates`, so there is no way to make one from a browser. Issue \#1094
 * gave the callable that does write them a caller, but a seeded document is
 * still the faithful stand-in for *another device* - which is what the
 * criterion below is about.
 */
test.describe('Live table view', () => {
  /** The restaurant this run seeded its published plan under. */
  let restaurantId: string | undefined;

  test.afterEach(async ({ page }) => {
    const seeded = restaurantId;

    restaurantId = undefined;

    if (seeded) {
      await deleteFirestoreCollection(
        page,
        `restaurants/${seeded}/tableStates`,
      );
      await deleteFloorPlan(page, seeded);
    }
  });

  test('shows the room as it stands and follows it as it changes', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();

    restaurantId = `live-tables-restaurant-${runId}`;
    await seedPlanForThisRoom(page, restaurantId, `Service Bistro ${runId}`);

    // Three of the four tables in the dining room are doing something; the
    // fourth has no document at all.
    await seedTableState(page, restaurantId, 'table-1', 'occupied', {
      sinceOffsetMs: TWENTY_TWO_MINUTES_MS,
    });
    await seedTableState(page, restaurantId, 'table-2', 'cleaning');
    await seedTableState(page, restaurantId, 'table-3', 'reserved', {
      note: 'Held for the 20:00 birthday',
    });
    // In the other room, so it must not reach this room's summary.
    await seedTableState(page, restaurantId, 'table-9', 'occupied');

    await loginAsBusinessUser(page);

    const tables = new TablePlanPage(page);
    await tables.goto(restaurantId);

    // The page says whether what is on screen has been confirmed by the
    // server, because a room where everything looks free has to be
    // distinguishable from a room nothing has been heard about yet.
    await expect(tables.live).toContainText('Live');

    // ------------------------------------------------------ what the room is

    // Table 4 has no state document and is counted free, which is the whole of
    // what "no document" means.
    await tables.expectCount('available', 1);
    await tables.expectCount('occupied', 1);
    await tables.expectCount('reserved', 1);
    await tables.expectCount('cleaning', 1);

    // The summary bar is also the legend: the status *word* is here rather than
    // on the plan, so it has to be spelled out.
    await expect(tables.countFor('occupied')).toContainText('Occupied');
    await expect(tables.countFor('cleaning')).toContainText('Cleaning');

    // Every table carries a silhouette, which is the channel that survives
    // greyscale and a colour-vision deficiency.
    for (const table of TABLES.filter((row) => row.roomId === DINING.id)) {
      await expect(tables.statusMark(table.id)).toBeVisible();
    }

    // A running clock takes the seat count's place; a free table keeps it.
    await expect(tables.duration('table-1')).toContainText('22 min');
    await expect(tables.seats('table-1')).toHaveCount(0);
    await expect(tables.seats('table-4')).toBeVisible();
    await expect(tables.duration('table-4')).toHaveCount(0);

    // The table is named by what it is doing, whether or not the drawing had
    // room for the word.
    await expect(tables.table('table-1')).toHaveAttribute(
      'aria-label',
      /Occupied/,
    );

    // -------------------------------------------------------- one table, read

    await tables.tapTable('table-3');

    await expect(tables.detail).toContainText('Table 3');
    await expect(tables.detail).toContainText('Reserved');
    // The note is a sentence, which is why it is beside the plan rather than on
    // a 900 mm table.
    await expect(tables.detailNote).toContainText(
      'Held for the 20:00 birthday',
    );

    await tables.detailClose.click();
    await expect(tables.detail).toHaveCount(0);

    // ------------------------------------------------ the other device writes

    /*
     * The acceptance criterion: a state change made somewhere else is on this
     * screen within about a second, without a reload and without anything being
     * asked for again. The default expect timeout is longer than that, so the
     * assertion is followed by one that fails if the page merely caught up
     * eventually - `available` dropping to zero is the same snapshot arriving.
     */
    await seedTableState(page, restaurantId, 'table-4', 'occupied');

    await expect(tables.countFor('occupied')).toContainText('2', {
      timeout: 5_000,
    });
    await tables.expectCount('available', 0);
    await expect(tables.seats('table-4')).toHaveCount(0);
    await expect(tables.statusMark('table-4')).toBeVisible();

    // And a table freed elsewhere goes back to showing its capacity.
    await seedTableState(page, restaurantId, 'table-1', 'available');

    await expect(tables.countFor('available')).toContainText('1', {
      timeout: 5_000,
    });
    await expect(tables.seats('table-1')).toBeVisible();

    // ------------------------------------------------------ the other room

    await tables.room(TERRACE.id).click();

    // The terrace holds one table, and the dining room's states stayed there.
    await tables.expectCount('occupied', 1);
    await tables.expectCount('available', 0);
    await expect(tables.table('table-1')).toHaveCount(0);
    await expect(tables.table('table-9')).toBeVisible();
  });
});

/**
 * This journey's plan: two rooms and five tables, under the organisation
 * account. The shape of the fixture lives in `support/floor-plan.ts`, shared
 * with the staff-entry journey of issue \#1097.
 */
const seedPlanForThisRoom = (
  page: Page,
  restaurantId: string,
  restaurantName: string,
): Promise<void> =>
  seedPublishedPlan(page, {
    restaurantId,
    restaurantName,
    ownerUserId: TEST_USERS.organisation.uid,
    rooms: [DINING, TERRACE],
    tables: TABLES,
    position: POSITION,
  });

/**
 * One table's live state, written the way the backend would have.
 *
 * Straight to the emulator, because `firestore.rules` allows no client write
 * here at all - which is exactly why this is a faithful stand-in for the other
 * device rather than a shortcut around one.
 */
const seedTableState = async (
  page: Page,
  restaurantId: string,
  tableId: string,
  status: string,
  extra: { sinceOffsetMs?: number; note?: string } = {},
): Promise<void> => {
  await seedFirestoreDocument(
    page,
    `restaurants/${restaurantId}/tableStates/${tableId}`,
    {
      tableId: { stringValue: tableId },
      restaurantId: { stringValue: restaurantId },
      status: { stringValue: status },
      since: {
        integerValue: String(Date.now() - (extra.sinceOffsetMs ?? 0)),
      },
      updatedByUserId: { stringValue: TEST_USERS.organisation.uid },
      ...(extra.note === undefined
        ? {}
        : { note: { stringValue: extra.note } }),
    },
  );
};
