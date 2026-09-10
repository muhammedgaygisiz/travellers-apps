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
  setDoc,
  updateDoc,
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
