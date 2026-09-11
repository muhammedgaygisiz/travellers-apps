import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  CollectionReference,
  DocumentReference,
  Firestore,
} from 'firebase/firestore';

/**
 * The rules suite for `apps/bite-tribe-firebase/firestore.rules` (issue #1078).
 *
 * It runs against the Firestore emulator through
 * `npm run test:emulator` in `apps/bite-tribe-firebase/functions`, which starts
 * the emulator from `firebase.emulator-test.json` - the config that already
 * points at the real rules file.
 *
 * **Every protected collection has an allow case and a deny case**, because a
 * rules file is only half tested by proving it refuses things: a rule that
 * refuses everything passes every deny test and breaks the product. The allow
 * cases are written against the writes the apps actually make, so a rule that
 * is correct in the abstract and wrong about a real payload fails here rather
 * than in the app.
 *
 * Its own project id keeps it apart from the Admin SDK emulator specs, which
 * bypass rules and would otherwise share this database.
 */
const PROJECT_ID = 'bite-tribe-rules-tests';

const OPERATOR = 'operator-uid';
const OWNER = 'restaurant-owner-uid';
const OTHER_BUSINESS = 'other-business-uid';
const CONSUMER = 'consumer-uid';
const STRANGER = 'stranger-uid';

const OWNED_RESTAURANT = 'owned-restaurant';
const OWNED_MENU = 'owned-menu';
const FOREIGN_RESTAURANT = 'foreign-restaurant';
const FOREIGN_MENU = 'foreign-menu';
const LEGACY_MENU = 'legacy-menu';

const OWNED_ROOM = 'owned-room';
const OWNED_TABLE = 'owned-table';
const FOREIGN_ROOM = 'foreign-room';

/**
 * A table that already carries a QR token, kept apart from `OWNED_TABLE` so
 * that both halves of the `qrTokenId` rule have something real to act on: a
 * table with no token may not gain one from a client, and a table with one may
 * be saved back whole without losing it (issue #1086).
 */
const TOKENED_TABLE = 'tokened-table';

/**
 * The length a real token has, and deliberately nothing else about one.
 *
 * `generateTableQrToken` draws 26 characters of Crockford base32 at random, and
 * a fixture that looked like that is a fixture the repository's secret scanner
 * reports as a leaked credential - the correct behaviour from a scanner, and a
 * false alarm every reviewer afterwards has to dismiss. What a fixture here has
 * to be is 26 characters the rules accept as a document id, so it is that and
 * visibly nothing more.
 */
const ACTIVE_TOKEN = 'TEST-ACTIVE-TABLE-TOKEN-01';
const REVOKED_TOKEN = 'TEST-REVOKED-TABLE-TOKEN-1';

/** The version the owned room is stored at, so a stale save has one to miss. */
const STORED_ROOM_VERSION = 3;

/** The floor-plan room the owned restaurant is stored with. */
interface RoomFixture {
  name: string;
  order: number;
  size: { width: number; height: number };
  objects: {
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    rotation: number;
  }[];
  version: number;
}

const roomAtVersion = (version: number): RoomFixture => ({
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 6000 },
  objects: [
    {
      id: 'wall-1',
      type: 'wall',
      position: { x: 4000, y: 0 },
      size: { width: 8000, height: 120 },
      rotation: 0,
    },
  ],
  version,
});

const TABLE_FIXTURE = {
  label: '12',
  roomId: OWNED_ROOM,
  position: { x: 2000, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
};

let testEnv: RulesTestEnvironment;

const asOperator = (): Firestore =>
  testEnv.authenticatedContext(OPERATOR, { roles: ['admin'] }).firestore();

const asOwner = (): Firestore =>
  testEnv.authenticatedContext(OWNER, { roles: ['business'] }).firestore();

const asOtherBusiness = (): Firestore =>
  testEnv
    .authenticatedContext(OTHER_BUSINESS, { roles: ['business'] })
    .firestore();

const asConsumer = (): Firestore =>
  testEnv.authenticatedContext(CONSUMER).firestore();

const asStranger = (): Firestore =>
  testEnv.authenticatedContext(STRANGER).firestore();

const asStaff = (): Firestore =>
  testEnv.authenticatedContext(STRANGER, { roles: ['staff'] }).firestore();

const anonymously = (): Firestore =>
  testEnv.unauthenticatedContext().firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(
        resolve(__dirname, '../../../../firestore.rules'),
        'utf8',
      ),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

/**
 * The fixtures every block reads from, written with rules disabled because they
 * are the *state* the rules are evaluated against, not writes under test.
 */
beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'restaurants', OWNED_RESTAURANT), {
      name: 'Owned Bistro',
      ownerUserId: OWNER,
      claimStatus: 'claimed',
      menuId: OWNED_MENU,
    });
    await setDoc(doc(db, 'restaurants', FOREIGN_RESTAURANT), {
      name: 'Someone Else',
      ownerUserId: OTHER_BUSINESS,
      claimStatus: 'claimed',
      menuId: FOREIGN_MENU,
    });
    await setDoc(doc(db, 'restaurants', 'unowned-restaurant'), {
      name: 'Nobody Holds This',
    });

    await setDoc(doc(db, 'menus', OWNED_MENU), {
      restaurantId: OWNED_RESTAURANT,
      categories: [],
    });
    await setDoc(doc(db, 'menus', FOREIGN_MENU), {
      restaurantId: FOREIGN_RESTAURANT,
      categories: [],
    });
    // A menu written before this rule existed: no `restaurantId` at all.
    await setDoc(doc(db, 'menus', LEGACY_MENU), { categories: [] });

    await setDoc(doc(db, 'bites', 'consumer-bite'), {
      userId: CONSUMER,
      name: 'Ramen',
      thumbup: 3,
    });
    await setDoc(doc(db, 'bites', 'consumer-bite', 'likes', STRANGER), {
      userId: STRANGER,
      likeType: 'thumbup',
      biteId: 'consumer-bite',
    });

    await setDoc(doc(db, 'reviews', 'consumer-review'), {
      authorId: CONSUMER,
      biteId: 'consumer-bite',
      review: 'Good',
    });
    await setDoc(doc(db, 'bucketlists', 'consumer-list'), {
      userId: CONSUMER,
      name: 'Munich',
      biteIds: [],
    });
    await setDoc(doc(db, 'biteTrails', 'consumer-trail'), {
      ownerId: CONSUMER,
      name: 'Munich Trail',
      biteIds: [],
    });

    await setDoc(doc(db, 'users', CONSUMER), {
      userId: CONSUMER,
      displayName: 'Consumer',
      email: 'consumer@test.com',
      photoUrl: '',
      about: 'Hungry',
      biteCount: 7,
      subscriptionTier: 0,
      followersCount: 2,
    });
    await setDoc(doc(db, 'users', STRANGER), {
      userId: STRANGER,
      displayName: 'Stranger',
      email: 'stranger@test.com',
      photoUrl: '',
    });
    await setDoc(doc(db, 'settings', CONSUMER), { theme: 'dark' });

    // Written only by `addRestaurantStaff` through the Admin SDK (issue #1537).
    await setDoc(doc(db, 'restaurantStaff', STRANGER), {
      userId: STRANGER,
      restaurantId: OWNED_RESTAURANT,
      addedBy: OWNER,
      addedAt: '2026-09-10T09:00:00.000Z',
      addedAtTimestamp: 1789030800000,
    });

    // The floor plan of the owned restaurant, plus one belonging to another
    // account, so a cross-account read has something real to be refused (#1081).
    await setDoc(
      doc(db, 'restaurants', OWNED_RESTAURANT, 'rooms', OWNED_ROOM),
      roomAtVersion(STORED_ROOM_VERSION),
    );
    await setDoc(
      doc(db, 'restaurants', OWNED_RESTAURANT, 'tables', OWNED_TABLE),
      TABLE_FIXTURE,
    );
    await setDoc(
      doc(db, 'restaurants', OWNED_RESTAURANT, 'tables', TOKENED_TABLE),
      { ...TABLE_FIXTURE, label: '14', qrTokenId: ACTIVE_TOKEN },
    );
    await setDoc(
      doc(db, 'restaurants', FOREIGN_RESTAURANT, 'rooms', FOREIGN_ROOM),
      roomAtVersion(1),
    );

    // Written only by `issueTableQrTokens`, `rotateTableQrToken` and
    // `syncTableQrTokenOnTableWrite` through the Admin SDK (issue #1086).
    await setDoc(doc(db, 'tableTokens', ACTIVE_TOKEN), {
      restaurantId: OWNED_RESTAURANT,
      roomId: OWNED_ROOM,
      tableId: TOKENED_TABLE,
      tableLabel: '14',
      tableEnabled: true,
      status: 'active',
      issuedAt: '2026-09-10T09:00:00.000Z',
      issuedAtTimestamp: 1789030800000,
    });
    await setDoc(doc(db, 'tableTokens', REVOKED_TOKEN), {
      restaurantId: OWNED_RESTAURANT,
      roomId: OWNED_ROOM,
      tableId: 'a-table-that-was-deleted',
      tableLabel: '21',
      tableEnabled: false,
      status: 'revoked',
      issuedAt: '2026-08-01T09:00:00.000Z',
      issuedAtTimestamp: 1785574800000,
      endedAt: '2026-09-01T09:00:00.000Z',
      endedAtTimestamp: 1788253200000,
    });

    await setDoc(doc(db, 'meta', 'leaderboard'), { entries: [] });
    await setDoc(doc(db, 'displayNames', 'consumer'), { userId: CONSUMER });
    await setDoc(doc(db, 'restaurantCandidates', 'candidate-1'), {
      status: 'pending',
    });
    await setDoc(doc(db, 'accountDeletions', 'deletion-1'), {
      userId: 'gone-uid',
    });
    await setDoc(doc(db, 'pushTokens', 'token-1'), {
      userUid: CONSUMER,
      installationId: 'installation-1',
    });
  });
});

describe('restaurants', () => {
  it('lets the assigned owner edit the restaurant profile', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'restaurants', OWNED_RESTAURANT), {
        description: 'Family-run since 1998',
      }),
    );
  });

  it('refuses a business account editing a restaurant it does not hold', async () => {
    await assertFails(
      updateDoc(doc(asOtherBusiness(), 'restaurants', OWNED_RESTAURANT), {
        description: 'Not mine to write',
      }),
    );
  });

  it('refuses an unheld restaurant to every business account', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'restaurants', 'unowned-restaurant'), {
        description: 'Unclaimed',
      }),
    );
  });

  /**
   * The forgery this issue was reopened for: before these rules, one PATCH
   * writing `ownerUserId` made any business account the owner of any
   * restaurant, leaving nothing in the operator log because no operator was
   * involved.
   */
  it('refuses a business account assigning itself a restaurant', async () => {
    await assertFails(
      updateDoc(doc(asOtherBusiness(), 'restaurants', 'unowned-restaurant'), {
        ownerUserId: OTHER_BUSINESS,
        claimStatus: 'claimed',
      }),
    );
  });

  it('refuses the owner rewriting the ownership fields of its own restaurant', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'restaurants', OWNED_RESTAURANT), {
        ownerUserId: OTHER_BUSINESS,
      }),
    );
  });

  it('refuses an operator writing the ownership fields from a client', async () => {
    await assertFails(
      updateDoc(doc(asOperator(), 'restaurants', 'unowned-restaurant'), {
        ownerUserId: OWNER,
        claimStatus: 'claimed',
      }),
    );
  });

  it('lets an operator create a restaurant', async () => {
    await assertSucceeds(
      setDoc(doc(asOperator(), 'restaurants', 'operator-created'), {
        name: 'Verified Place',
        position: { latitude: 48.1, longitude: 11.5 },
      }),
    );
  });

  it('refuses an operator creating a restaurant that is already owned', async () => {
    await assertFails(
      setDoc(doc(asOperator(), 'restaurants', 'operator-created'), {
        name: 'Verified Place',
        ownerUserId: OWNER,
      }),
    );
  });

  it('refuses a business account creating a restaurant for itself', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'restaurants', 'self-created'), {
        name: 'My Own Place',
      }),
    );
  });

  it('still lets any signed-in account read restaurants', async () => {
    await assertSucceeds(
      getDoc(doc(asConsumer(), 'restaurants', OWNED_RESTAURANT)),
    );
  });
});

describe('menus', () => {
  it('lets the restaurant owner save its menu', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'menus', OWNED_MENU), {
        restaurantId: OWNED_RESTAURANT,
        categories: [{ title: 'Starters', items: [] }],
      }),
    );
  });

  /**
   * Proves the no-backfill claim: the rule reads the restaurant, never a field
   * on the menu, so a menu written before `restaurantId` existed is still
   * writable by the account holding its restaurant.
   */
  it('lets the owner save a menu that predates the restaurantId field', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(context.firestore(), 'restaurants', OWNED_RESTAURANT),
        { menuId: LEGACY_MENU },
      );
    });

    await assertSucceeds(
      updateDoc(doc(asOwner(), 'menus', LEGACY_MENU), {
        restaurantId: OWNED_RESTAURANT,
        categories: [],
      }),
    );
  });

  it("refuses a business account saving another restaurant's menu", async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'menus', FOREIGN_MENU), {
        restaurantId: FOREIGN_RESTAURANT,
        categories: [{ title: 'Injected', items: [] }],
      }),
    );
  });

  /**
   * The claim has to be checked in both directions. Naming a restaurant the
   * caller really does own is not enough if that restaurant does not point at
   * this menu, or every owner could write every menu.
   */
  it('refuses naming an owned restaurant to reach a menu it does not point at', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'menus', FOREIGN_MENU), {
        restaurantId: OWNED_RESTAURANT,
        categories: [{ title: 'Injected', items: [] }],
      }),
    );
  });

  /**
   * The rule reads the document the write would leave behind, so a menu that
   * already carries the field is authorised without the write repeating it.
   * A menu that carries nothing has nothing to authorise from and is refused
   * until a write names its restaurant.
   */
  it('refuses a save on an unattributed menu that names no restaurant', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'menus', LEGACY_MENU), {
        categories: [{ title: 'Anonymous', items: [] }],
      }),
    );
  });

  it('lets the restaurant owner create a menu for its restaurant', async () => {
    await assertSucceeds(
      addDoc(collection(asOwner(), 'menus'), {
        restaurantId: OWNED_RESTAURANT,
        categories: [],
      }),
    );
  });

  it('refuses creating a menu for a restaurant the caller does not hold', async () => {
    await assertFails(
      addDoc(collection(asOwner(), 'menus'), {
        restaurantId: FOREIGN_RESTAURANT,
        categories: [],
      }),
    );
  });
});

describe('staff', () => {
  /**
   * `staff` grants nothing at the data layer yet, and that is deliberate: the
   * record of which restaurant a staff account works at is issue #1537 and does
   * not exist, so there is nothing for a rule to scope the role against. A rule
   * admitting `staff` to restaurants at all would be a blanket
   * any-staff-writes-any-restaurant permission - the shape of hole this issue
   * closes. The role still opens the business app and reads.
   */
  it('refuses a staff account writing a restaurant', async () => {
    await assertFails(
      updateDoc(doc(asStaff(), 'restaurants', OWNED_RESTAURANT), {
        description: 'Staff edit',
      }),
    );
  });

  it('still lets a staff account read a restaurant', async () => {
    await assertSucceeds(
      getDoc(doc(asStaff(), 'restaurants', OWNED_RESTAURANT)),
    );
  });

  /**
   * The association between a staff account and its restaurant (issue #1537).
   *
   * Three readers and no writer, which is the whole rule: the association only
   * means anything alongside the `staff` custom claim, and no client can write
   * a claim — so a client that could write this document could only ever
   * produce half of a grant.
   */
  it('lets a staff account read its own association', async () => {
    await assertSucceeds(getDoc(doc(asStaff(), 'restaurantStaff', STRANGER)));
  });

  it('lets the restaurant owner read the association of its staff', async () => {
    await assertSucceeds(getDoc(doc(asOwner(), 'restaurantStaff', STRANGER)));
  });

  it('lets an operator read any association', async () => {
    await assertSucceeds(
      getDoc(doc(asOperator(), 'restaurantStaff', STRANGER)),
    );
  });

  it('refuses a business account reading the staff of a restaurant it does not hold', async () => {
    await assertFails(
      getDoc(doc(asOtherBusiness(), 'restaurantStaff', STRANGER)),
    );
  });

  it('refuses a consumer account reading who works where', async () => {
    await assertFails(getDoc(doc(asConsumer(), 'restaurantStaff', STRANGER)));
  });

  it('refuses an account writing its own association', async () => {
    await assertFails(
      setDoc(doc(asStaff(), 'restaurantStaff', STRANGER), {
        userId: STRANGER,
        restaurantId: FOREIGN_RESTAURANT,
      }),
    );
  });

  it('refuses a restaurant owner writing an association by hand', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'restaurantStaff', CONSUMER), {
        userId: CONSUMER,
        restaurantId: OWNED_RESTAURANT,
      }),
    );
  });

  it('refuses an operator writing an association by hand', async () => {
    await assertFails(
      deleteDoc(doc(asOperator(), 'restaurantStaff', STRANGER)),
    );
  });
});

describe('floor plans', () => {
  const roomDoc = (
    db: Firestore,
    restaurantId: string,
    roomId: string,
  ): DocumentReference => doc(db, 'restaurants', restaurantId, 'rooms', roomId);

  const tablesOf = (db: Firestore, restaurantId: string): CollectionReference =>
    collection(db, 'restaurants', restaurantId, 'tables');

  describe('reads', () => {
    it('lets the owner load a room and query its tables', async () => {
      await assertSucceeds(
        getDoc(roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM)),
      );
      await assertSucceeds(
        getDocs(
          query(
            tablesOf(asOwner(), OWNED_RESTAURANT),
            where('roomId', '==', OWNED_ROOM),
          ),
        ),
      );
    });

    it('lets an operator read a plan for support', async () => {
      await assertSucceeds(
        getDoc(roomDoc(asOperator(), OWNED_RESTAURANT, OWNED_ROOM)),
      );
    });

    /**
     * The acceptance criterion of issue #1081, and the reason this collection
     * departs from the file's "reads stay where they were": the plan is new, so
     * nothing regresses by starting closed, and a restaurant's interior layout
     * is not something every signed-in account should be able to enumerate.
     */
    it('refuses a business account reading a plan it does not hold', async () => {
      await assertFails(
        getDoc(roomDoc(asOtherBusiness(), OWNED_RESTAURANT, OWNED_ROOM)),
      );
      await assertFails(getDocs(tablesOf(asOtherBusiness(), OWNED_RESTAURANT)));
    });

    it('refuses a consumer account reading a plan', async () => {
      await assertFails(
        getDoc(roomDoc(asConsumer(), OWNED_RESTAURANT, OWNED_ROOM)),
      );
    });

    /**
     * Staff read the *published* plan, and there is no published state until
     * issue #1088 splits draft from published. Admitting staff now would hand
     * them the draft an owner is halfway through rearranging.
     */
    it('refuses a staff account reading the plan before there is a published one', async () => {
      await assertFails(
        getDoc(roomDoc(asStaff(), OWNED_RESTAURANT, OWNED_ROOM)),
      );
    });
  });

  describe('writes', () => {
    it('lets the owner create a room at version 1', async () => {
      await assertSucceeds(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, 'terrace'),
          roomAtVersion(1),
        ),
      );
    });

    it('refuses a room created at any other version', async () => {
      await assertFails(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, 'terrace'),
          roomAtVersion(7),
        ),
      );
    });

    it('lets the owner place a table', async () => {
      await assertSucceeds(
        setDoc(doc(tablesOf(asOwner(), OWNED_RESTAURANT), 'table-13'), {
          ...TABLE_FIXTURE,
          label: '13',
        }),
      );
    });

    /**
     * `qrTokenId` is backend-owned (issue #1086). Naming it in the rules is
     * what stops an owner pointing their table at another restaurant's token,
     * or resurrecting one that was revoked - both of which are a printed code
     * resolving somewhere it should not.
     */
    it('refuses a client changing a table QR token', async () => {
      await assertFails(
        updateDoc(doc(tablesOf(asOwner(), OWNED_RESTAURANT), TOKENED_TABLE), {
          qrTokenId: REVOKED_TOKEN,
        }),
      );
    });

    it('refuses a client giving an untokened table a token', async () => {
      await assertFails(
        updateDoc(doc(tablesOf(asOwner(), OWNED_RESTAURANT), OWNED_TABLE), {
          qrTokenId: ACTIVE_TOKEN,
        }),
      );
    });

    it('refuses a table created carrying a token', async () => {
      await assertFails(
        setDoc(doc(tablesOf(asOwner(), OWNED_RESTAURANT), 'table-15'), {
          ...TABLE_FIXTURE,
          label: '15',
          qrTokenId: ACTIVE_TOKEN,
        }),
      );
    });

    /**
     * The half that has to keep working. The editor reads a table and writes it
     * back whole, token field included, so a rule comparing keys rather than
     * values would fail every ordinary save of a table that has a code.
     */
    it('accepts a table save that carries the token it read', async () => {
      await assertSucceeds(
        setDoc(doc(tablesOf(asOwner(), OWNED_RESTAURANT), TOKENED_TABLE), {
          ...TABLE_FIXTURE,
          label: '14',
          seats: 6,
          qrTokenId: ACTIVE_TOKEN,
        }),
      );
    });

    it('lets the owner delete a table and an empty room', async () => {
      await assertSucceeds(
        deleteDoc(doc(tablesOf(asOwner(), OWNED_RESTAURANT), OWNED_TABLE)),
      );
      await assertSucceeds(
        deleteDoc(roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM)),
      );
    });

    it('refuses a business account writing a plan it does not hold', async () => {
      await assertFails(
        updateDoc(roomDoc(asOtherBusiness(), OWNED_RESTAURANT, OWNED_ROOM), {
          ...roomAtVersion(STORED_ROOM_VERSION + 1),
        }),
      );
      await assertFails(
        setDoc(doc(tablesOf(asOtherBusiness(), OWNED_RESTAURANT), 'table-14'), {
          ...TABLE_FIXTURE,
          label: '14',
        }),
      );
    });

    it('refuses a room under a restaurant nobody holds', async () => {
      await assertFails(
        setDoc(
          roomDoc(asOwner(), 'unowned-restaurant', 'room-1'),
          roomAtVersion(1),
        ),
      );
    });

    /**
     * Editing the plan is restaurant maintenance, and `admin` never acquires
     * that by implication — see the operator note in the rules file. An
     * operator sees the plan and does not rearrange it.
     */
    it('refuses an operator editing a plan', async () => {
      await assertFails(
        setDoc(
          roomDoc(asOperator(), OWNED_RESTAURANT, OWNED_ROOM),
          roomAtVersion(STORED_ROOM_VERSION + 1),
        ),
      );
    });
  });

  describe('optimistic concurrency', () => {
    it('accepts a save carrying the successor of the stored version', async () => {
      await assertSucceeds(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM),
          roomAtVersion(STORED_ROOM_VERSION + 1),
        ),
      );
    });

    /**
     * The conflict this issue exists for. The second device read the room at
     * version 3, the first device already saved 4, and the second device's save
     * still claims 4 — which is no longer the successor of what is stored, so
     * it is refused rather than quietly replacing a rearrangement it never saw.
     */
    it('refuses a save from a device that read an older version', async () => {
      await assertSucceeds(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM),
          roomAtVersion(STORED_ROOM_VERSION + 1),
        ),
      );

      await assertFails(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM),
          roomAtVersion(STORED_ROOM_VERSION + 1),
        ),
      );
    });

    it('refuses a save that leaves the version where it was', async () => {
      await assertFails(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM),
          roomAtVersion(STORED_ROOM_VERSION),
        ),
      );
    });

    it('refuses a save that skips a version', async () => {
      await assertFails(
        setDoc(
          roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM),
          roomAtVersion(STORED_ROOM_VERSION + 2),
        ),
      );
    });

    /**
     * A partial write is a save too. Renaming the room without advancing the
     * version leaves the stored version in place, which is not its own
     * successor - so there is no way to touch a room without declaring which
     * version the change was made against.
     */
    it('refuses a partial update that does not advance the version', async () => {
      await assertFails(
        updateDoc(roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM), {
          name: 'Renamed without a version',
        }),
      );
    });

    /**
     * The layout split earning its keep: a geometry save writes the room
     * document and nothing else, so the table documents the QR tokens, visits
     * and orders point at come through a rearrangement untouched.
     */
    it('leaves table documents untouched when the room geometry is saved', async () => {
      const before = await getDoc(
        doc(tablesOf(asOwner(), OWNED_RESTAURANT), OWNED_TABLE),
      );

      await assertSucceeds(
        setDoc(roomDoc(asOwner(), OWNED_RESTAURANT, OWNED_ROOM), {
          ...roomAtVersion(STORED_ROOM_VERSION + 1),
          objects: [],
        }),
      );

      const after = await getDoc(
        doc(tablesOf(asOwner(), OWNED_RESTAURANT), OWNED_TABLE),
      );

      expect(after.data()).toEqual(before.data());
      expect(after.data()).toEqual(TABLE_FIXTURE);
    });
  });
});

describe('table qr tokens', () => {
  const tokens = (db: Firestore): CollectionReference =>
    collection(db, 'tableTokens');

  /**
   * The one collection an unauthenticated client may read, and the reason it
   * is top-level: a guest scanning a code at a table has no session, and the
   * scan is what establishes which restaurant they would be signing in to.
   */
  it('lets a guest with no session resolve a token in one read', async () => {
    const snapshot = await assertSucceeds(
      getDoc(doc(tokens(anonymously()), ACTIVE_TOKEN)),
    );

    expect(snapshot.data()).toMatchObject({
      restaurantId: OWNED_RESTAURANT,
      roomId: OWNED_ROOM,
      tableId: TOKENED_TABLE,
      tableLabel: '14',
      status: 'active',
    });
  });

  /**
   * A revoked token is still a document, so the scan resolves to "no longer
   * valid" rather than to nothing. Deleting it would make a retired table's
   * sticker indistinguishable from a code that was never issued.
   */
  it('resolves a revoked token to a document that says so', async () => {
    const snapshot = await assertSucceeds(
      getDoc(doc(tokens(anonymously()), REVOKED_TOKEN)),
    );

    expect(snapshot.data()).toMatchObject({ status: 'revoked' });
  });

  it('resolves a token that was never issued to a missing document', async () => {
    const snapshot = await assertSucceeds(
      getDoc(doc(tokens(anonymously()), 'NEVERISSUEDNEVERISSUED00')),
    );

    expect(snapshot.exists()).toBe(false);
  });

  /**
   * The enumeration defence, and the acceptance criterion of issue #1086.
   * `get` is allowed and `list` is not, so a token can be read by whoever holds
   * the printed code and the set of them cannot be walked - not by a guest, not
   * by the restaurant, not by an operator.
   */
  it('refuses listing the collection to everyone', async () => {
    await assertFails(getDocs(tokens(anonymously())));
    await assertFails(getDocs(tokens(asConsumer())));
    await assertFails(getDocs(tokens(asOwner())));
    await assertFails(getDocs(tokens(asOperator())));
  });

  it('refuses a filtered query as firmly as an unfiltered one', async () => {
    await assertFails(
      getDocs(
        query(tokens(asOwner()), where('restaurantId', '==', OWNED_RESTAURANT)),
      ),
    );
  });

  /**
   * Never client-writable, by anyone, including the restaurant that owns the
   * table. A token is created by the backend or not at all.
   */
  it('refuses every client write, including the restaurant owner', async () => {
    const forged = {
      restaurantId: OWNED_RESTAURANT,
      roomId: OWNED_ROOM,
      tableId: TOKENED_TABLE,
      tableLabel: '14',
      tableEnabled: true,
      status: 'active',
      issuedAt: '2026-09-11T09:00:00.000Z',
      issuedAtTimestamp: 1789117200000,
    };

    await assertFails(setDoc(doc(tokens(anonymously()), 'FORGED'), forged));
    await assertFails(setDoc(doc(tokens(asConsumer()), 'FORGED'), forged));
    await assertFails(setDoc(doc(tokens(asOwner()), 'FORGED'), forged));
    await assertFails(setDoc(doc(tokens(asOperator()), 'FORGED'), forged));
  });

  it('refuses reviving a revoked token and deleting an active one', async () => {
    await assertFails(
      updateDoc(doc(tokens(asOwner()), REVOKED_TOKEN), { status: 'active' }),
    );
    await assertFails(deleteDoc(doc(tokens(asOwner()), ACTIVE_TOKEN)));
  });
});

describe('bites', () => {
  it('lets an account create its own Bite', async () => {
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'bites', 'new-bite'), {
        userId: CONSUMER,
        name: 'Pho',
      }),
    );
  });

  it('refuses creating a Bite for another account', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'bites', 'forged-bite'), {
        userId: CONSUMER,
        name: 'Not mine',
      }),
    );
  });

  it('lets an account edit and delete its own Bite', async () => {
    await assertSucceeds(
      updateDoc(doc(asConsumer(), 'bites', 'consumer-bite'), { price: 12 }),
    );
    await assertSucceeds(
      deleteDoc(doc(asConsumer(), 'bites', 'consumer-bite')),
    );
  });

  it("refuses editing and deleting another account's Bite", async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'bites', 'consumer-bite'), { price: 1 }),
    );
    await assertFails(deleteDoc(doc(asStranger(), 'bites', 'consumer-bite')));
  });

  /** The admin app's Bite migrations rewrite Bites belonging to every account. */
  it('lets an operator edit any Bite', async () => {
    await assertSucceeds(
      updateDoc(doc(asOperator(), 'bites', 'consumer-bite'), {
        geohash: 'u281z',
      }),
    );
  });

  it('lets an account react under its own uid only', async () => {
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'bites', 'consumer-bite', 'likes', CONSUMER), {
        userId: CONSUMER,
        likeType: 'drooling',
        biteId: 'consumer-bite',
      }),
    );
    await assertFails(
      setDoc(doc(asConsumer(), 'bites', 'consumer-bite', 'likes', STRANGER), {
        userId: STRANGER,
        likeType: 'drooling',
        biteId: 'consumer-bite',
      }),
    );
  });

  it("refuses deleting another account's reaction", async () => {
    await assertFails(
      deleteDoc(doc(asConsumer(), 'bites', 'consumer-bite', 'likes', STRANGER)),
    );
  });
});

describe('reviews', () => {
  it('lets an account write a review as itself', async () => {
    await assertSucceeds(
      addDoc(collection(asConsumer(), 'reviews'), {
        authorId: CONSUMER,
        author: 'Consumer',
        biteId: 'consumer-bite',
        review: 'Delicious',
      }),
    );
  });

  it('refuses writing a review in another account name', async () => {
    await assertFails(
      addDoc(collection(asStranger(), 'reviews'), {
        authorId: CONSUMER,
        author: 'Consumer',
        biteId: 'consumer-bite',
        review: 'Not mine',
      }),
    );
  });

  it("refuses editing another account's review", async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'reviews', 'consumer-review'), {
        review: 'Rewritten',
      }),
    );
  });
});

describe('bucket lists', () => {
  it('lets an account keep its own bucket list', async () => {
    await assertSucceeds(
      updateDoc(doc(asConsumer(), 'bucketlists', 'consumer-list'), {
        biteIds: ['consumer-bite'],
      }),
    );
  });

  it("refuses writing another account's bucket list", async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'bucketlists', 'consumer-list'), {
        biteIds: [],
      }),
    );
  });
});

describe('bite trails', () => {
  it('lets an account create and edit its own trail', async () => {
    await assertSucceeds(
      addDoc(collection(asConsumer(), 'biteTrails'), {
        ownerId: CONSUMER,
        name: 'New Trail',
        biteIds: [],
      }),
    );
    await assertSucceeds(
      updateDoc(doc(asConsumer(), 'biteTrails', 'consumer-trail'), {
        price: 5,
      }),
    );
  });

  it("refuses editing another account's trail", async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'biteTrails', 'consumer-trail'), {
        price: 0,
      }),
    );
  });

  it('lets a buyer record its own purchase and no one else’s', async () => {
    await assertSucceeds(
      addDoc(
        collection(asStranger(), 'biteTrails', 'consumer-trail', 'sells'),
        {
          userId: STRANGER,
          soldAt: new Date().toISOString(),
        },
      ),
    );
    await assertFails(
      addDoc(
        collection(asStranger(), 'biteTrails', 'consumer-trail', 'sells'),
        {
          userId: CONSUMER,
          soldAt: new Date().toISOString(),
        },
      ),
    );
  });

  it('lets an account rate a trail under its own uid only', async () => {
    await assertSucceeds(
      setDoc(
        doc(asStranger(), 'biteTrails', 'consumer-trail', 'ratings', STRANGER),
        { rating: 4 },
      ),
    );
    await assertFails(
      setDoc(
        doc(asStranger(), 'biteTrails', 'consumer-trail', 'ratings', CONSUMER),
        { rating: 1 },
      ),
    );
  });
});

describe('users', () => {
  it('lets an account edit its own profile', async () => {
    await assertSucceeds(
      updateDoc(doc(asConsumer(), 'users', CONSUMER), {
        about: 'Still hungry',
        city: 'Munich',
      }),
    );
  });

  it("refuses editing another account's profile", async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'users', CONSUMER), { about: 'Hacked' }),
    );
  });

  it('refuses granting itself a paid subscription tier', async () => {
    await assertFails(
      updateDoc(doc(asConsumer(), 'users', CONSUMER), { subscriptionTier: 2 }),
    );
  });

  it('refuses inflating its own leaderboard count', async () => {
    await assertFails(
      updateDoc(doc(asConsumer(), 'users', CONSUMER), { biteCount: 9999 }),
    );
  });

  /**
   * The profile write paths send whole objects back. A backend-owned field
   * carried at the value it already has is not a change, and must not be
   * refused, or an ordinary profile edit would fail.
   */
  it('allows a profile edit that echoes the backend-owned values unchanged', async () => {
    await assertSucceeds(
      updateDoc(doc(asConsumer(), 'users', CONSUMER), {
        about: 'Echoed',
        biteCount: 7,
        subscriptionTier: 0,
        followersCount: 2,
      }),
    );
  });

  it('lets an account follow another and refuses forging somebody else’s follow', async () => {
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'users', STRANGER, 'followers', CONSUMER), {
        followerUid: CONSUMER,
        followedUid: STRANGER,
      }),
    );
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'users', CONSUMER, 'following', STRANGER), {
        followerUid: CONSUMER,
        followedUid: STRANGER,
      }),
    );
    await assertFails(
      setDoc(
        doc(asConsumer(), 'users', STRANGER, 'followers', OTHER_BUSINESS),
        {
          followerUid: OTHER_BUSINESS,
          followedUid: STRANGER,
        },
      ),
    );
    await assertFails(
      setDoc(doc(asConsumer(), 'users', STRANGER, 'following', CONSUMER), {
        followerUid: STRANGER,
        followedUid: CONSUMER,
      }),
    );
  });

  it('keeps push installations to the account that registered them', async () => {
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'users', CONSUMER, 'pushTokens', 'token-1'), {
        installationId: 'installation-1',
        enabled: true,
      }),
    );
    await assertFails(
      setDoc(doc(asConsumer(), 'users', STRANGER, 'pushTokens', 'token-9'), {
        installationId: 'installation-9',
      }),
    );
  });

  it('refuses deleting a profile from a client', async () => {
    await assertFails(deleteDoc(doc(asConsumer(), 'users', CONSUMER)));
  });
});

describe('settings', () => {
  it('lets an account read and write only its own settings', async () => {
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'settings', CONSUMER), { theme: 'light' }),
    );
    await assertFails(getDoc(doc(asStranger(), 'settings', CONSUMER)));
    await assertFails(
      setDoc(doc(asStranger(), 'settings', CONSUMER), { theme: 'light' }),
    );
  });
});

describe('backend-owned collections', () => {
  it('stay readable and refuse every client write', async () => {
    await assertSucceeds(getDoc(doc(asConsumer(), 'meta', 'leaderboard')));
    await assertFails(
      setDoc(doc(asConsumer(), 'meta', 'leaderboard'), { entries: ['me'] }),
    );

    await assertSucceeds(getDoc(doc(asConsumer(), 'displayNames', 'consumer')));
    await assertFails(
      setDoc(doc(asStranger(), 'displayNames', 'consumer'), {
        userId: STRANGER,
      }),
    );

    await assertSucceeds(
      getDoc(doc(asOperator(), 'restaurantCandidates', 'candidate-1')),
    );
    await assertFails(
      updateDoc(doc(asOperator(), 'restaurantCandidates', 'candidate-1'), {
        status: 'verified',
      }),
    );
  });

  it('keeps account deletion records out of every client', async () => {
    await assertFails(
      getDoc(doc(asOperator(), 'accountDeletions', 'deletion-1')),
    );
    await assertFails(
      setDoc(doc(asConsumer(), 'accountDeletions', 'deletion-2'), {
        userId: CONSUMER,
      }),
    );
  });

  it('keeps the push token index unreadable and self-written', async () => {
    await assertFails(getDoc(doc(asConsumer(), 'pushTokens', 'token-1')));
    await assertSucceeds(
      setDoc(doc(asConsumer(), 'pushTokens', 'token-2'), {
        userUid: CONSUMER,
        installationId: 'installation-1',
      }),
    );
    await assertFails(
      setDoc(doc(asStranger(), 'pushTokens', 'token-3'), {
        userUid: CONSUMER,
        installationId: 'installation-1',
      }),
    );
  });
});

describe('everything else', () => {
  it('refuses a collection these rules do not name', async () => {
    await assertFails(
      setDoc(doc(asConsumer(), 'somethingNew', 'doc-1'), { value: 1 }),
    );
    await assertFails(getDoc(doc(asConsumer(), 'somethingNew', 'doc-1')));
  });

  it('refuses an unauthenticated caller everywhere', async () => {
    await assertFails(getDoc(doc(anonymously(), 'bites', 'consumer-bite')));
    await assertFails(
      setDoc(doc(anonymously(), 'bites', 'anon-bite'), { userId: CONSUMER }),
    );
    await assertFails(
      getDoc(doc(anonymously(), 'restaurants', OWNED_RESTAURANT)),
    );
  });
});
