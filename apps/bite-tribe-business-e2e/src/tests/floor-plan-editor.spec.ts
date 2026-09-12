import { expect, Page, test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { expectIonDisabled, FloorPlanPage } from '../pages/floor-plan.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  expectFirestoreCollection,
  FirestoreCollectionEntry,
  getFirestoreDocument,
  listFirestoreDocuments,
  seedFirestoreDocument,
} from '../support/firestore';
import { deleteFloorPlan } from '../support/floor-plan';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

/** The room the journey builds, in the metres an owner types. */
const ROOM = { name: 'Main dining room', width: 7.5, height: 5 } as const;

/** What the two tables are, as the owner describes them. */
const RECTANGLE = { label: '12', seats: 6 } as const;
const ROUND = { label: '13', seats: 2 } as const;

/** One nudge is one grid cell, and the plan starts on a 500 mm grid. */
const GRID_MM = 500;

/**
 * Building a floor plan and getting it back:
 * [[UC - Configure Restaurant Floor Plans And Tables]].
 *
 * This is the journey the epic's first success criterion is written as - build
 * a plan and reload it identically - and it is the only place the whole chain
 * runs as an owner runs it: the route guard, the room create, the metre form,
 * palette placement, keyboard nudging, the label rule, the autosaved draft,
 * publish validation, the three publish writes, and the token issue that
 * follows them.
 *
 * Every outcome is asserted against the stored documents rather than against a
 * picture of the editor. A screenshot would pass on a plan that renders
 * correctly and stores nothing, which is the failure this is for: a table is a
 * business entity that live state, visits and a scanned code all point at, so
 * what has to be right is the document.
 */
test.describe('Configure a restaurant floor plan', () => {
  /** The restaurant this run built its plan under, while it has one. */
  let restaurantId: string | undefined;

  /**
   * Hands the fixtures back.
   *
   * A restaurant on this account stays on its dashboard list for the whole
   * run, and the specs that assert what the account does *not* own would then
   * be asserting against this one's leftovers.
   */
  test.afterEach(async ({ page }) => {
    const built = restaurantId;

    restaurantId = undefined;

    if (built) {
      await deleteFloorPlan(page, built);
    }
  });

  test('builds a room with two tables, publishes it, and reloads it identically', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const runId = Date.now();
    const restaurantName = `Floor Plan Bistro ${runId}`;

    restaurantId = `floor-plan-restaurant-${runId}`;
    await seedRestaurant(page, restaurantId, restaurantName);

    await loginAsBusinessUser(page);

    const dashboard = new DashboardPage(page);
    await dashboard.openRestaurants();
    await dashboard.expectRestaurant(restaurantName);
    await dashboard.openRestaurant(restaurantName, restaurantId);

    // The editor is reached from the restaurant it belongs to, which is the
    // only path an owner has to it: the dashboard lists restaurants, not plans.
    await page.getByTestId('edit-restaurant-floor-plan').click();
    await page.waitForURL(`**/restaurant/${restaurantId}/floor-plan`);

    const floorPlan = new FloorPlanPage(page);
    await floorPlan.expectLoaded();

    // A restaurant with no rooms has nothing to draw on and nothing to print.
    await expect(floorPlan.empty).toBeVisible();

    await floorPlan.createRoom();
    await floorPlan.setRoom(ROOM);

    // A rectangular four-top, renumbered and given its real capacity, then
    // moved two grid cells clear of the middle of the view - which is where
    // the next placement lands, and the reason this journey can tell the two
    // tables apart by position alone.
    await floorPlan.place('table-rectangle');
    await floorPlan.setTableLabel(RECTANGLE.label);
    await floorPlan.setTableSeats(RECTANGLE.seats);
    await floorPlan.nudgeSelection('ArrowLeft', 2);

    await floorPlan.place('table-round');
    await floorPlan.setTableLabel(ROUND.label);
    await floorPlan.setTableSeats(ROUND.seats);

    await expect(floorPlan.items).toHaveCount(2);
    await expect(
      floorPlan.item(
        `Rectangular table ${RECTANGLE.label}, ${RECTANGLE.seats} seat(s)`,
      ),
    ).toHaveCount(1);
    await expect(
      floorPlan.item(`Round table ${ROUND.label}, ${ROUND.seats} seat(s)`),
    ).toHaveCount(1);

    // Nothing is live yet. The tables are in the draft and have no documents,
    // so they have no codes either and printing is closed.
    await expect(floorPlan.unpublished).toBeVisible();
    await expectIonDisabled(floorPlan.qrCodes);
    await expect(page.getByTestId('floor-plan-qr-codes-blocked')).toBeVisible();

    await floorPlan.publish();

    const rooms = await expectFirestoreCollection(
      page,
      `restaurants/${restaurantId}/rooms`,
      1,
    );
    const roomId = rooms[0].id;

    expect(rooms[0].fields).toMatchObject({
      name: ROOM.name,
      order: 0,
      objects: [],
      // Created at version one and published as its successor, which is the
      // rule `firestore.rules` enforces on every room write.
      version: 2,
      size: { width: 7500, height: 5000 },
    });

    // The draft is what has *not* been published, so a publish that landed
    // leaves none behind.
    expect(
      await getFirestoreDocument(
        page,
        `restaurants/${restaurantId}/rooms/${roomId}/drafts/current`,
      ),
    ).toBeUndefined();

    // Publishing is what asks for the codes, so the tables are read back once
    // every one of them carries the token the backend wrote. What those codes
    // print as is `table-qr-codes.spec.ts`.
    const published = await pollTables(page, restaurantId, 2);
    const rectangle = tableLabelled(published, RECTANGLE.label);
    const round = tableLabelled(published, ROUND.label);

    expect(rectangle.fields).toMatchObject({
      label: RECTANGLE.label,
      seats: RECTANGLE.seats,
      shape: 'rectangle',
      size: { width: 1200, height: 800 },
      rotation: 0,
      enabled: true,
      roomId,
    });
    expect(round.fields).toMatchObject({
      label: ROUND.label,
      seats: ROUND.seats,
      shape: 'round',
      diameter: 900,
      rotation: 0,
      enabled: true,
      roomId,
    });

    // The shape is a discriminated union rather than two optional fields, and
    // the write path is what keeps it one: a round table carries no width and
    // height to disagree with its diameter.
    expect(rectangle.fields['diameter']).toBeUndefined();
    expect(round.fields['size']).toBeUndefined();

    const centre = positionOf(round);
    const nudged = positionOf(rectangle);

    // Both were placed in the middle of the view; only one was nudged. Two
    // presses of one grid cell is what separates them, and the millimetre is
    // exact because snapping lands every measurement on the grid.
    expect(nudged).toEqual({ x: centre.x - 2 * GRID_MM, y: centre.y });
    // A centre on the floor is what makes a table a table in this room.
    expect(centre.x).toBeGreaterThan(0);
    expect(centre.x).toBeLessThan(7500);
    expect(centre.y).toBeGreaterThan(0);
    expect(centre.y).toBeLessThan(5000);

    // ------------------------------------------------------- and back again

    await page.reload();
    await floorPlan.expectLoaded();

    // The room as it was typed, read back off the stored plan through the
    // millimetre conversion and out into the metre form.
    await expect(floorPlan.roomName).toHaveValue(ROOM.name);
    await expect(floorPlan.roomWidth).toHaveValue('7.5');
    await expect(floorPlan.roomHeight).toHaveValue('5');
    await expect(floorPlan.room(ROOM.name)).toBeVisible();
    await expect(floorPlan.restaurantSummary).toContainText(
      '1 room(s), 2 table(s), 8 seat(s)',
    );

    await expect(floorPlan.items).toHaveCount(2);
    await expect(
      floorPlan.item(
        `Rectangular table ${RECTANGLE.label}, ${RECTANGLE.seats} seat(s)`,
      ),
    ).toHaveCount(1);
    await expect(
      floorPlan.item(`Round table ${ROUND.label}, ${ROUND.seats} seat(s)`),
    ).toHaveCount(1);

    // The editor's own statement that what it loaded is what is published:
    // the note appears for any difference, the draft included.
    await floorPlan.expectEverythingPublished();

    // And the plan itself did not move. Opening the editor reads; a reload
    // that rewrote a table would change its stored fields even while the
    // screen looked right, which is the failure the comparison is for.
    expect(
      await listFirestoreDocuments(page, `restaurants/${restaurantId}/tables`),
    ).toEqual(published);
    expect(
      await listFirestoreDocuments(page, `restaurants/${restaurantId}/rooms`),
    ).toEqual(rooms);
    expect(
      await getFirestoreDocument(
        page,
        `restaurants/${restaurantId}/rooms/${roomId}/drafts/current`,
      ),
    ).toBeUndefined();
  });
});

/**
 * A restaurant assigned to the account the suite signs in as.
 *
 * The assignment is the whole precondition: the route guard, the Firestore
 * rules on every room, table and draft write, and the token callable all check
 * `ownerUserId` against the signed-in account, so an unassigned fixture would
 * be refused at each of them.
 */
const seedRestaurant = async (
  page: Page,
  restaurantId: string,
  name: string,
): Promise<void> =>
  seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
    id: { stringValue: restaurantId },
    name: { stringValue: name },
    description: { stringValue: '' },
    ownerUserId: { stringValue: TEST_USERS.organisation.uid },
    claimStatus: { stringValue: 'claimed' },
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: POSITION.latitude },
          longitude: { doubleValue: POSITION.longitude },
        },
      },
    },
  });

/**
 * The tables, once every one of them carries its QR token.
 *
 * `qrTokenId` is backend-owned: the publish writes the tables and the callable
 * writes the token on to them a moment later. Reading before that settles
 * would compare a plan against itself mid-write.
 */
const pollTables = async (
  page: Page,
  restaurantId: string,
  count: number,
): Promise<FirestoreCollectionEntry[]> => {
  const path = `restaurants/${restaurantId}/tables`;

  await expect
    .poll(
      async () => {
        const tables = await listFirestoreDocuments(page, path);

        return tables.filter((table) => table.fields['qrTokenId']).length;
      },
      { timeout: 30_000 },
    )
    .toBe(count);

  return listFirestoreDocuments(page, path);
};

const tableLabelled = (
  tables: readonly FirestoreCollectionEntry[],
  label: string,
): FirestoreCollectionEntry => {
  const table = tables.find((entry) => entry.fields['label'] === label);

  expect(table, `no stored table labelled ${label}`).toBeDefined();

  return table as FirestoreCollectionEntry;
};

const positionOf = (
  table: FirestoreCollectionEntry,
): { x: number; y: number } =>
  table.fields['position'] as { x: number; y: number };
