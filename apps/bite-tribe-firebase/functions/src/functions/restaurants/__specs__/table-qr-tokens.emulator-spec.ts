import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { handleSyncTableQrTokenOnTableWrite } from '../sync-table-qr-token-on-table-write';
import {
  IssueTableQrTokensResult,
  RotateTableQrTokenResult,
  TABLE_TOKENS_COLLECTION,
  issueTableQrTokensHandler,
  rotateTableQrTokenHandler,
} from '../table-qr-tokens';

/**
 * The QR token lifecycle against the real database (GitHub issue #1086).
 *
 * The emulator rather than a fake Firestore, because every claim this issue
 * makes is about documents: that a scan is one read, that a revoked token is
 * still there to be read, that rotation leaves the table alone, and that the
 * table document and the token document never land apart. A mocked store would
 * assert that the code called `set` - which is the part that was never in
 * doubt.
 *
 * The Firestore *rules* half - public `get`, refused `list`, refused write -
 * is in `src/firestore-rules/__specs__/firestore-rules.emulator-spec.ts`, which
 * runs with rules enabled. The Admin SDK bypasses rules, so it cannot be
 * checked from here.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const OTHER_BUSINESS = 'other-business-uid';
const OPERATOR = 'operator-uid';

const RESTAURANT = 'owned-restaurant';
const DINING_ROOM = 'dining-room';
const TERRACE = 'terrace';

const TABLE_12 = 'table-12';
const TABLE_13 = 'table-13';
const RETIRED_TABLE = 'table-retired';

interface Caller {
  uid: string;
  roles: string[];
}

const asOwner: Caller = { uid: OWNER, roles: ['business'] };
const asOtherBusiness: Caller = { uid: OTHER_BUSINESS, roles: ['business'] };
const asOperator: Caller = { uid: OPERATOR, roles: ['admin'] };
const asConsumer: Caller = { uid: 'consumer-uid', roles: [] };

const request = (caller: Caller, data: Record<string, unknown>): never =>
  ({
    auth: { uid: caller.uid, token: { roles: caller.roles } },
    data,
  }) as never;

const issue = (
  caller: Caller,
  data: Record<string, unknown>,
): Promise<IssueTableQrTokensResult> =>
  issueTableQrTokensHandler(request(caller, data));

const rotate = (
  caller: Caller,
  data: Record<string, unknown>,
): Promise<RotateTableQrTokenResult> =>
  rotateTableQrTokenHandler(request(caller, data));

const tableRef = (tableId: string): DocumentReference =>
  getFirestore()
    .collection('restaurants')
    .doc(RESTAURANT)
    .collection('tables')
    .doc(tableId);

const readTable = async (tableId: string): Promise<DocumentData> =>
  (await tableRef(tableId).get()).data() ?? {};

const readToken = async (token: string): Promise<DocumentData | undefined> =>
  (
    await getFirestore().collection(TABLE_TOKENS_COLLECTION).doc(token).get()
  ).data();

/** What the trigger does, driven the way Firestore would drive it. */
const afterTableWrite = async (
  tableId: string,
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): Promise<void> =>
  handleSyncTableQrTokenOnTableWrite(RESTAURANT, tableId, before, after);

const table = (
  label: string,
  roomId: string,
  enabled = true,
): Record<string, unknown> => ({
  label,
  roomId,
  position: { x: 2000, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled,
  shape: 'round',
  diameter: 900,
});

const seed = async (): Promise<void> => {
  const db = getFirestore();

  await db.collection('restaurants').doc(RESTAURANT).set({
    name: 'Owned Bistro',
    ownerUserId: OWNER,
    claimStatus: 'claimed',
  });
  await db.collection('restaurants').doc('foreign-restaurant').set({
    name: 'Someone Else',
    ownerUserId: OTHER_BUSINESS,
  });

  await Promise.all([
    tableRef(TABLE_12).set(table('12', DINING_ROOM)),
    tableRef(TABLE_13).set(table('13', DINING_ROOM)),
    tableRef(RETIRED_TABLE).set(table('99', DINING_ROOM, false)),
  ]);
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection(TABLE_TOKENS_COLLECTION)),
  ]);
};

describe('table QR tokens', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table QR token emulator specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await clear();
    await seed();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  describe('issuing', () => {
    it('gives every enabled table an active token and names it on the table', async () => {
      const result = await issue(asOwner, { restaurantId: RESTAURANT });

      expect(result.tokens).toHaveLength(2);
      expect(result.skippedTableIds).toEqual([RETIRED_TABLE]);

      for (const issued of result.tokens) {
        expect(issued.status).toBe('issued');
        expect(await readToken(issued.token)).toMatchObject({
          restaurantId: RESTAURANT,
          roomId: DINING_ROOM,
          tableId: issued.tableId,
          tableLabel: issued.label,
          tableEnabled: true,
          status: 'active',
        });
        expect((await readTable(issued.tableId))['qrTokenId']).toBe(
          issued.token,
        );
      }
    });

    /**
     * The acceptance criterion "tokens cannot be derived from a table number, a
     * restaurant id, or another token", asserted on the tokens the product
     * actually issued rather than on the generator alone.
     *
     * The label is lengthened for the check, and that is the point rather than
     * a convenience. A real label is one or two characters, and a random
     * 26-character draw contains any given two characters about one time in
     * forty - so asserting that a token does not contain "12" is a test that
     * fails a correct generator every fortieth run and proves nothing when it
     * passes. Ten characters from the token's own alphabet cannot appear by
     * chance, so the assertion means what it says.
     */
    it('issues a token that encodes nothing about the table or the restaurant', async () => {
      const label = 'QZ7XW3MKVB';

      await tableRef(TABLE_13).update({ label });

      const {
        tokens: [issued],
      } = await issue(asOwner, {
        restaurantId: RESTAURANT,
        tableIds: [TABLE_13],
      });

      expect(issued.label).toBe(label);
      expect(issued.token).not.toContain(label);
      expect(issued.token).not.toContain(RESTAURANT.toUpperCase());
      expect(issued.token).not.toContain(DINING_ROOM.toUpperCase());
      expect(issued.token).not.toContain(TABLE_13.toUpperCase());
    });

    /** Neither is a token derivable from the one on the next table. */
    it('draws unrelated tokens for tables numbered one apart', async () => {
      const { tokens } = await issue(asOwner, { restaurantId: RESTAURANT });
      const [first, second] = tokens.map((issued) => issued.token);

      expect(first).not.toBe(second);
      expect(first.slice(0, 8)).not.toBe(second.slice(0, 8));
      expect(first.slice(-8)).not.toBe(second.slice(-8));
    });

    /**
     * The repeat call is the normal one: publishing a plan (issue #1088) and
     * opening the QR sheet (issue #1087) both ask for tokens, and a second call
     * that minted new ones would invalidate every sheet already printed.
     */
    it('leaves an existing token alone when asked again', async () => {
      const first = await issue(asOwner, { restaurantId: RESTAURANT });
      const second = await issue(asOwner, { restaurantId: RESTAURANT });

      expect(second.tokens.map((token) => token.status)).toEqual([
        'existing',
        'existing',
      ]);
      expect(second.tokens.map((token) => token.token).sort()).toEqual(
        first.tokens.map((token) => token.token).sort(),
      );
    });

    it('issues for one named table without touching the others', async () => {
      const { tokens } = await issue(asOwner, {
        restaurantId: RESTAURANT,
        tableIds: [TABLE_12],
      });

      expect(tokens).toHaveLength(1);
      expect(tokens[0].tableId).toBe(TABLE_12);
      expect((await readTable(TABLE_13))['qrTokenId']).toBeUndefined();
    });

    /**
     * A code printed for a table that is not in service is a code that has to
     * be thrown away. Skipping it inside a whole-plan run is not the same
     * answer as naming it: the first is "there was nothing to do", the second
     * is somebody asking for that code.
     */
    it('refuses a table that is not in service when it is named', async () => {
      await expect(
        issue(asOwner, {
          restaurantId: RESTAURANT,
          tableIds: [RETIRED_TABLE],
        }),
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('refuses a table that does not exist', async () => {
      await expect(
        issue(asOwner, { restaurantId: RESTAURANT, tableIds: ['nowhere'] }),
      ).rejects.toMatchObject({ code: 'not-found' });
    });
  });

  describe('authorisation', () => {
    it('refuses a business account that does not hold the restaurant', async () => {
      await expect(
        issue(asOtherBusiness, { restaurantId: RESTAURANT }),
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });

    it('refuses an account with no business or admin role', async () => {
      await expect(
        issue(asConsumer, { restaurantId: RESTAURANT }),
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });

    /**
     * `RD-UR-6`: the operator maintains every restaurant, so a restaurant that
     * has lost access to its own account still has a way to get its codes back.
     */
    it('admits an operator on a restaurant it does not hold', async () => {
      const { tokens } = await issue(asOperator, { restaurantId: RESTAURANT });

      expect(tokens).toHaveLength(2);
    });

    it('refuses a restaurant that does not exist', async () => {
      await expect(
        issue(asOwner, { restaurantId: 'no-such-restaurant' }),
      ).rejects.toMatchObject({ code: 'not-found' });
    });
  });

  describe('rotation', () => {
    it('supersedes the old token, names its successor and keeps the table', async () => {
      const {
        tokens: [issued],
      } = await issue(asOwner, {
        restaurantId: RESTAURANT,
        tableIds: [TABLE_12],
      });
      const before = await readTable(TABLE_12);

      const rotated = await rotate(asOwner, {
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
      });

      expect(rotated.status).toBe('rotated');
      expect(rotated.previousToken).toBe(issued.token);
      expect(rotated.token).not.toBe(issued.token);

      expect(await readToken(issued.token)).toMatchObject({
        status: 'superseded',
        supersededBy: rotated.token,
      });
      expect(await readToken(rotated.token)).toMatchObject({
        status: 'active',
        tableId: TABLE_12,
        tableLabel: '12',
      });

      const after = await readTable(TABLE_12);

      expect(after['qrTokenId']).toBe(rotated.token);
      expect({ ...after, qrTokenId: undefined }).toEqual({
        ...before,
        qrTokenId: undefined,
      });
    });

    /**
     * The superseded token is still readable, and says what happened to it. A
     * deleted document would tell a guest holding the old sheet nothing at all.
     */
    it('leaves the old token resolvable in one read', async () => {
      const {
        tokens: [issued],
      } = await issue(asOwner, {
        restaurantId: RESTAURANT,
        tableIds: [TABLE_12],
      });

      await rotate(asOwner, { restaurantId: RESTAURANT, tableId: TABLE_12 });

      const stale = await readToken(issued.token);

      expect(stale).toBeDefined();
      expect(stale?.['status']).toBe('superseded');
      expect(stale?.['endedAt']).toEqual(expect.any(String));
      expect(stale?.['tableId']).toBe(TABLE_12);
    });

    it('issues a first token when the table has none', async () => {
      const rotated = await rotate(asOwner, {
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
      });

      expect(rotated.status).toBe('issued');
      expect(rotated.previousToken).toBeUndefined();
    });

    it('refuses a rotation from an account that does not hold the restaurant', async () => {
      await expect(
        rotate(asOtherBusiness, {
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
        }),
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });
  });

  describe('the table write trigger', () => {
    const issueFor = async (tableId: string): Promise<string> => {
      const {
        tokens: [issued],
      } = await issue(asOwner, {
        restaurantId: RESTAURANT,
        tableIds: [tableId],
      });

      return issued.token;
    };

    it('revokes the token of a deleted table and keeps the document', async () => {
      const token = await issueFor(TABLE_12);
      const before = await readTable(TABLE_12);

      await tableRef(TABLE_12).delete();
      await afterTableWrite(TABLE_12, before, undefined);

      expect(await readToken(token)).toMatchObject({
        status: 'revoked',
        tableId: TABLE_12,
        tableLabel: '12',
        endedAt: expect.any(String),
      });
    });

    /**
     * A table keeps its token when it moves room (issue #1085), which is what
     * makes a code already stuck to it keep working - so the token has to
     * follow it, or the single read resolves to a room the table has left.
     */
    it('follows a table that moves to another room', async () => {
      const token = await issueFor(TABLE_12);
      const before = await readTable(TABLE_12);
      const after = { ...before, roomId: TERRACE };

      await tableRef(TABLE_12).set(after);
      await afterTableWrite(TABLE_12, before, after);

      expect(await readToken(token)).toMatchObject({
        roomId: TERRACE,
        status: 'active',
      });
    });

    it('follows a rename and a table taken out of service', async () => {
      const token = await issueFor(TABLE_12);
      const before = await readTable(TABLE_12);
      const after = { ...before, label: '12a', enabled: false };

      await tableRef(TABLE_12).set(after);
      await afterTableWrite(TABLE_12, before, after);

      expect(await readToken(token)).toMatchObject({
        tableLabel: '12a',
        tableEnabled: false,
        status: 'active',
      });
    });

    it('leaves a superseded token where it is when the table changes', async () => {
      const stale = await issueFor(TABLE_12);
      const rotated = await rotate(asOwner, {
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
      });
      const before = await readTable(TABLE_12);
      const after = { ...before, roomId: TERRACE };

      await tableRef(TABLE_12).set(after);
      await afterTableWrite(TABLE_12, before, after);

      expect(await readToken(stale)).toMatchObject({
        roomId: DINING_ROOM,
        status: 'superseded',
      });
      expect(await readToken(rotated.token)).toMatchObject({
        roomId: TERRACE,
        status: 'active',
      });
    });

    it('does nothing for a table that holds no token', async () => {
      const before = await readTable(TABLE_13);

      await afterTableWrite(TABLE_13, before, { ...before, label: '14' });

      expect(
        (await getFirestore().collection(TABLE_TOKENS_COLLECTION).get()).size,
      ).toBe(0);
    });

    /**
     * The callables write `qrTokenId` themselves, so this runs on their own
     * write too. It must be a no-op there, or every issue would cost a second
     * write and the two could disagree.
     */
    it('writes nothing when the token already matches the table', async () => {
      const token = await issueFor(TABLE_12);
      const current = await readTable(TABLE_12);
      const before = await readToken(token);

      await afterTableWrite(TABLE_12, current, current);

      expect(await readToken(token)).toEqual(before);
    });
  });
});
