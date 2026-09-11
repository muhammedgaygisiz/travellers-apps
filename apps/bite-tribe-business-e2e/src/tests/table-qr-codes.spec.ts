import { expect, Page, test } from '@playwright/test';
import { expectIonEnabled, FloorPlanPage } from '../pages/floor-plan.page';
import { TableQrSheetsPage } from '../pages/table-qr-sheets.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  FirestoreCollectionEntry,
  getFirestoreDocument,
  listFirestoreDocuments,
  seedFirestoreDocument,
} from '../support/firestore';
import { deleteFloorPlan } from '../support/floor-plan';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

const ROOM = { id: 'main-room', name: 'Main dining room' } as const;

/**
 * The plan the sheet is printed from: two tables in service and one that is
 * not, which is the state the page has to report rather than draw.
 */
const TABLES = [
  { id: 'table-11', label: '11', seats: 4, enabled: true },
  { id: 'table-12', label: '12', seats: 2, enabled: true },
  { id: 'table-13', label: '13', seats: 6, enabled: false },
] as const;

const IN_SERVICE = TABLES.filter((table) => table.enabled);

/** 26 characters of Crockford base32, uppercase, as issue \#1086 draws them. */
const TOKEN_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

/**
 * Getting the table codes on to paper:
 * [[UC - Configure Restaurant Floor Plans And Tables]].
 *
 * The plan is seeded as published rather than built through the editor. The
 * build journey is `floor-plan-editor.spec.ts`; what this one is about starts
 * where that one ends, and seeding the published state is what lets it assert
 * the parts an owner reprinting one sticker actually depends on: that opening
 * the page mints a code for every table in service and none for the others,
 * that the code, the number, the room and the restaurant travel together, and
 * that ticking one table off prints one sticker rather than a sheet.
 *
 * Printing itself is not driven. `window.print()` opens the browser's own
 * dialog, which the runner cannot see into; the preview is the same elements
 * at the same millimetre sizes, so it is what the assertions are about.
 */
test.describe('Print table QR codes', () => {
  /** The restaurant this run seeded its published plan under. */
  let restaurantId: string | undefined;

  test.afterEach(async ({ page }) => {
    const seeded = restaurantId;

    restaurantId = undefined;

    if (seeded) {
      await deleteFloorPlan(page, seeded);
    }
  });

  test('issues a code for every table in service and lays the sheet out for print', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const restaurantName = `QR Code Bistro ${runId}`;

    restaurantId = `qr-codes-restaurant-${runId}`;
    await seedPublishedPlan(page, restaurantId, restaurantName);

    await loginAsBusinessUser(page);

    // Reached from the editor, which is where an owner is when they decide to
    // print - and the button is open because the seeded plan is published.
    const floorPlan = new FloorPlanPage(page);
    await floorPlan.goto(restaurantId);
    await floorPlan.expectEverythingPublished();
    await floorPlan.openQrCodes(restaurantId);

    const sheets = new TableQrSheetsPage(page);

    // The page asks for the tokens as it loads, so two codes appearing is the
    // callable having answered for both tables in service.
    await sheets.expectCodes(2);

    // The third table is not drawn and not silently dropped: a sheet short one
    // sticker is otherwise discovered by walking the room.
    await expect(sheets.disabled).toContainText('13');
    await expect(sheets.code('table-13')).toHaveCount(0);

    // Everything a person holding the sticker needs in order to put it on the
    // right table without scanning it.
    for (const table of IN_SERVICE) {
      await expect(sheets.code(table.id)).toContainText(table.label);
      await expect(sheets.code(table.id)).toContainText(ROOM.name);
      await expect(sheets.code(table.id)).toContainText(restaurantName);
    }

    // Twelve stickers fit on a sheet, so two tables are one page.
    await expect(sheets.sheetPage(1)).toBeVisible();
    await expect(sheets.sheetPage(2)).toHaveCount(0);
    await expectIonEnabled(sheets.print);
    await expect(sheets.print).toContainText('Print 2 code(s)');

    // ------------------------------------------------- what was written down

    const tables = await listFirestoreDocuments(
      page,
      `restaurants/${restaurantId}/tables`,
    );

    const tokens = IN_SERVICE.map((table) => {
      const token = String(tableWithId(tables, table.id).fields['qrTokenId']);

      expect(token).toMatch(TOKEN_PATTERN);

      return token;
    });

    /*
     * Opaque, which here means drawn rather than derived: two tables numbered
     * one apart get two unrelated codes, so a sheet from table 11 says nothing
     * about the code on table 12.
     *
     * Deliberately not asserted as "the token does not contain the label". A
     * token is 26 characters drawn from a 32-character alphabet that includes
     * every digit, so it holds the pair `12` by chance a few runs in a
     * hundred - a test that fails that often gates nothing.
     */
    expect(new Set(tokens).size).toBe(tokens.length);

    // One active token per table in service, resolving in a single read to the
    // restaurant, the room and the number.
    for (const [index, table] of IN_SERVICE.entries()) {
      expect(
        await getFirestoreDocument(page, `tableTokens/${tokens[index]}`),
      ).toMatchObject({
        restaurantId,
        roomId: ROOM.id,
        tableId: table.id,
        tableLabel: table.label,
        tableEnabled: true,
        status: 'active',
      });
    }

    // A table out of service gets no code at all, which is the difference
    // between it and a table whose code says it is out of service.
    expect(tableWithId(tables, 'table-13').fields['qrTokenId']).toBeUndefined();

    // Nothing on this page rotates a code, so reloading it reprints the codes
    // already stuck to the tables rather than minting new ones.
    await page.reload();
    await sheets.expectCodes(2);

    const reissued = await listFirestoreDocuments(
      page,
      `restaurants/${restaurantId}/tables`,
    );

    expect(
      IN_SERVICE.map(
        (table) => tableWithId(reissued, table.id).fields['qrTokenId'],
      ),
    ).toEqual(tokens);

    // ------------------------------------------------- reprinting one sticker

    await sheets.tableRow('table-11').click();

    await sheets.expectCodes(1);
    await expect(sheets.code('table-12')).toBeVisible();
    await expect(sheets.code('table-11')).toHaveCount(0);
    await expect(sheets.print).toContainText('Print 1 code(s)');
  });
});

/**
 * A published plan: the restaurant, one room, and three tables.
 *
 * Written as documents rather than built in the editor because the tables are
 * what this journey needs, and it needs one of them out of service - a state
 * the editor's own journey covers reaching. The room carries the `version`
 * every room write is checked against, and no table carries a `qrTokenId`:
 * that field is backend-owned, and the page under test is what asks for it.
 */
const seedPublishedPlan = async (
  page: Page,
  restaurantId: string,
  restaurantName: string,
): Promise<void> => {
  await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
    id: { stringValue: restaurantId },
    name: { stringValue: restaurantName },
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

  await seedFirestoreDocument(
    page,
    `restaurants/${restaurantId}/rooms/${ROOM.id}`,
    {
      name: { stringValue: ROOM.name },
      order: { integerValue: '0' },
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

  for (const [index, table] of TABLES.entries()) {
    await seedFirestoreDocument(
      page,
      `restaurants/${restaurantId}/tables/${table.id}`,
      {
        label: { stringValue: table.label },
        roomId: { stringValue: ROOM.id },
        shape: { stringValue: 'rectangle' },
        rotation: { integerValue: '0' },
        seats: { integerValue: String(table.seats) },
        enabled: { booleanValue: table.enabled },
        position: {
          mapValue: {
            fields: {
              x: { integerValue: String(1000 + index * 2000) },
              y: { integerValue: '2000' },
            },
          },
        },
        size: {
          mapValue: {
            fields: {
              width: { integerValue: '1200' },
              height: { integerValue: '800' },
            },
          },
        },
      },
    );
  }
};

const tableWithId = (
  tables: readonly FirestoreCollectionEntry[],
  tableId: string,
): FirestoreCollectionEntry => {
  const table = tables.find((entry) => entry.id === tableId);

  expect(table, `no stored table ${tableId}`).toBeDefined();

  return table as FirestoreCollectionEntry;
};
