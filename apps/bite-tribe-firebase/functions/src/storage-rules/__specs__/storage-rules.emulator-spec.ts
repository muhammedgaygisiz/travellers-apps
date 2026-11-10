import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestContext,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

/**
 * The rules suite for `apps/bite-tribe-firebase/storage.rules` (issue #1350).
 *
 * It runs against the Storage and Firestore emulators together, because the
 * Bite, restaurant and Bite Trail rules read the owning document with
 * `firestore.get`. The documents are seeded with rules disabled; they are the
 * state the rules are judged against, not writes under test.
 *
 * **Every path has an allow case and a deny case.** A rule that refuses
 * everything passes every deny test and breaks every upload, so the allow cases
 * are the uploads the apps actually make: `images/{collection}/{docId}/{uuid}`
 * with an image content type. The deny cases are what the blanket rule this
 * replaced allowed, so a regression to `request.auth != null` fails here.
 *
 * **The project id is the one `emulators:exec --project` names**, not a
 * private one like the Firestore suite's. The Storage emulator answers
 * `firestore.get` from the Firestore emulator's database for the project it
 * was started with, whatever project the request names, so seeding any other
 * project leaves every lookup empty and every owner refused.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'owner-uid';
const STRANGER = 'stranger-uid';
const OPERATOR = 'operator-uid';
const HOLDER = 'restaurant-holder-uid';
const GUEST = 'guest-uid';

const BITE = 'existing-bite';
const PENDING_BITE = 'pending-bite';
const RESTAURANT = 'held-restaurant';
const MISSING_RESTAURANT = 'missing-restaurant';
const TRAIL = 'owned-trail';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IMAGE = { contentType: 'image/png' };

let testEnv: RulesTestEnvironment;

const member = (uid: string): RulesTestContext =>
  testEnv.authenticatedContext(uid);

const operator = (): RulesTestContext =>
  testEnv.authenticatedContext(OPERATOR, { roles: ['admin'] });

/** The anonymous session `signInAsGuest` mints at a table (#1565). */
const guest = (): RulesTestContext =>
  testEnv.authenticatedContext(GUEST, {
    firebase: { sign_in_provider: 'anonymous' },
  });

const upload = (
  context: RulesTestContext,
  path: string,
  data: Uint8Array = PNG,
  metadata: { contentType: string } = IMAGE,
): Promise<unknown> =>
  // The compat task is a thenable, not a Promise; `then` makes it one.
  context
    .storage()
    .ref(path)
    .put(data, metadata)
    .then((snapshot) => snapshot);

const metadataOf = (
  context: RulesTestContext,
  path: string,
): Promise<unknown> => context.storage().ref(path).getMetadata();

const remove = (context: RulesTestContext, path: string): Promise<unknown> =>
  context.storage().ref(path).delete();

const userImage = (uid: string): string => `images/users/${uid}/photo.png`;
const biteImage = (biteId: string): string =>
  `images/bites/${biteId}/photo.png`;
const restaurantImage = (id: string): string =>
  `images/restaurants/${id}/photo.png`;
const trailImage = (id: string): string => `images/biteTrails/${id}/photo.png`;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync(
        resolve(__dirname, '../../../../storage.rules'),
        'utf8',
      ),
    },
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

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'bites', BITE), { userId: OWNER });
    await setDoc(doc(db, 'restaurants', RESTAURANT), {
      ownerUserIds: [HOLDER],
    });
    await setDoc(doc(db, 'biteTrails', TRAIL), { ownerId: OWNER });

    // One existing object per path, for the overwrite, read and delete cases.
    await upload(context, userImage(OWNER));
    await upload(context, biteImage(BITE));
    await upload(context, restaurantImage(RESTAURANT));
    await upload(context, trailImage(TRAIL));
  });
});

describe('storage.rules (issue #1350)', () => {
  describe('profile images, images/users/{uid}', () => {
    it('lets an account upload and replace its own profile image', async () => {
      await assertSucceeds(
        upload(member(OWNER), 'images/users/owner-uid/new.png'),
      );
      await assertSucceeds(upload(member(OWNER), userImage(OWNER)));
    });

    it('refuses an upload into another account', async () => {
      await assertFails(
        upload(member(STRANGER), 'images/users/owner-uid/new.png'),
      );
    });

    it("refuses overwriting or deleting another account's image", async () => {
      await assertFails(upload(member(STRANGER), userImage(OWNER)));
      await assertFails(remove(member(STRANGER), userImage(OWNER)));
    });

    it('lets an account delete its own image', async () => {
      await assertSucceeds(remove(member(OWNER), userImage(OWNER)));
    });

    it('lets the owner read its image and refuses a stranger', async () => {
      await assertSucceeds(metadataOf(member(OWNER), userImage(OWNER)));
      await assertFails(metadataOf(member(STRANGER), userImage(OWNER)));
    });

    it('refuses an anonymous table guest, even under its own uid', async () => {
      await assertFails(upload(guest(), userImage(GUEST)));
    });

    it('refuses a write that is not an image', async () => {
      await assertFails(
        upload(member(OWNER), 'images/users/owner-uid/x.txt', PNG, {
          contentType: 'text/plain',
        }),
      );
    });

    it('refuses an image of 10 MB or more', async () => {
      await assertFails(
        upload(
          member(OWNER),
          'images/users/owner-uid/huge.png',
          new Uint8Array(10 * 1024 * 1024),
        ),
      );
    });
  });

  describe('Bite images, images/bites/{biteId}', () => {
    it('lets the Bite owner upload, read and delete', async () => {
      await assertSucceeds(
        upload(member(OWNER), 'images/bites/existing-bite/new.png'),
      );
      await assertSucceeds(metadataOf(member(OWNER), biteImage(BITE)));
      await assertSucceeds(remove(member(OWNER), biteImage(BITE)));
    });

    it('refuses another account uploading to, overwriting or deleting it', async () => {
      await assertFails(
        upload(member(STRANGER), 'images/bites/existing-bite/new.png'),
      );
      await assertFails(upload(member(STRANGER), biteImage(BITE)));
      await assertFails(remove(member(STRANGER), biteImage(BITE)));
    });

    it('refuses another account reading it', async () => {
      await assertFails(metadataOf(member(STRANGER), biteImage(BITE)));
    });

    it('accepts the photo of a Bite whose document has not landed yet', async () => {
      await assertSucceeds(upload(member(OWNER), biteImage(PENDING_BITE)));
    });

    it('refuses an anonymous guest even for a pending Bite', async () => {
      await assertFails(upload(guest(), biteImage(PENDING_BITE)));
    });

    it('lets an operator run the image migration on any Bite', async () => {
      await assertSucceeds(
        upload(operator(), 'images/bites/existing-bite/migrated.png'),
      );
    });
  });

  describe('restaurant images, images/restaurants/{restaurantId}', () => {
    it('lets a holder and an operator upload', async () => {
      await assertSucceeds(
        upload(member(HOLDER), 'images/restaurants/held-restaurant/new.png'),
      );
      await assertSucceeds(
        upload(operator(), 'images/restaurants/held-restaurant/op.png'),
      );
    });

    it('refuses an account that does not hold the restaurant', async () => {
      await assertFails(
        upload(member(STRANGER), 'images/restaurants/held-restaurant/new.png'),
      );
      await assertFails(remove(member(STRANGER), restaurantImage(RESTAURANT)));
    });

    it('refuses a member writing for a restaurant that does not exist', async () => {
      await assertFails(
        upload(member(HOLDER), restaurantImage(MISSING_RESTAURANT)),
      );
    });
  });

  describe('Bite Trail images, images/biteTrails/{biteTrailId}', () => {
    it('lets the trail owner upload and delete', async () => {
      await assertSucceeds(
        upload(member(OWNER), 'images/biteTrails/owned-trail/new.png'),
      );
      await assertSucceeds(remove(member(OWNER), trailImage(TRAIL)));
    });

    it('refuses another account', async () => {
      await assertFails(
        upload(member(STRANGER), 'images/biteTrails/owned-trail/new.png'),
      );
      await assertFails(remove(member(STRANGER), trailImage(TRAIL)));
    });
  });

  describe('paths no app writes', () => {
    it('refuses them to every account, operators included', async () => {
      await assertFails(upload(member(OWNER), 'exports/owner-uid/photo.png'));
      await assertFails(
        upload(member(OWNER), 'images/other/owner-uid/photo.png'),
      );
      await assertFails(upload(operator(), 'anything.png'));
    });
  });
});
