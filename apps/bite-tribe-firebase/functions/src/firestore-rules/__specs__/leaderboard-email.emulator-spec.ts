import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { doc, getDoc } from 'firebase/firestore';
import {
  LEADERBOARD_DOC,
  META_COLLECTION,
  readPersistedLeaderboard,
  rebuildLeaderboard,
} from '../../functions/shared/utils/leaderboard';

/**
 * What a member reads from `/meta/leaderboard` (issue #1611).
 *
 * The rules let any member read `/meta`, so the boundary is what the snapshot
 * holds, not whether a screen renders it. The snapshot here is written by the
 * real `rebuildLeaderboard` through the Admin SDK and read back through the
 * client SDK under the real rules - seeding the document by hand would only
 * prove the fixture.
 *
 * Its own project id keeps it apart from the main rules suite, which clears
 * its database before every test.
 */
const PROJECT_ID = 'bite-tribe-leaderboard-rules-tests';

const PUBLIC_EMAIL = 'jane@example.com';
const PRIVATE_EMAIL = 'john@example.com';

let testEnv: RulesTestEnvironment;

const memberReads = async (docId: string): Promise<unknown> => {
  const snapshot = await getDoc(
    doc(
      testEnv.authenticatedContext('member-uid').firestore(),
      META_COLLECTION,
      docId,
    ),
  );

  return snapshot.data();
};

const seedUsers = async (): Promise<void> => {
  const users = getFirestore().collection('users');

  await users.doc('public-user').set({
    userId: 'public-user',
    displayName: 'Jane',
    email: PUBLIC_EMAIL,
    photoUrl: 'https://example.com/jane.png',
    city: 'Zurich',
    public: true,
    biteCount: 12,
  });
  await users.doc('private-user').set({
    userId: 'private-user',
    displayName: 'John',
    email: PRIVATE_EMAIL,
    photoUrl: 'https://example.com/john.png',
    public: false,
    biteCount: 30,
  });
};

beforeAll(async () => {
  if (!process.env['FIRESTORE_EMULATOR_HOST']) {
    throw new Error('leaderboard rules specs require the Firestore emulator.');
  }

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(
        resolve(__dirname, '../../../../firestore.rules'),
        'utf8',
      ),
    },
  });

  if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedUsers();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(getApps().map((app) => deleteApp(app)));
});

describe('the leaderboard a member reads', () => {
  it('carries the public profile and no email address', async () => {
    await rebuildLeaderboard(getFirestore());

    const leaderboard = await memberReads(LEADERBOARD_DOC);

    expect(leaderboard).toMatchObject({
      users: [
        {
          userId: 'public-user',
          displayName: 'Jane',
          photoUrl: 'https://example.com/jane.png',
          city: 'Zurich',
          biteCount: 12,
        },
      ],
    });
    expect(JSON.stringify(leaderboard)).not.toMatch(/email|@example\.com/);
  });

  /**
   * A snapshot persisted before the fix still caches the address, and nothing
   * but a Bite write used to rewrite it. Reading it through the shared helper -
   * as `loadLeaderboard` and the daily job do - rebuilds it, and what the helper
   * returns is what the daily job writes as its next baseline.
   */
  it('stops carrying a cached address once the snapshot is read after the deploy', async () => {
    await getFirestore()
      .collection(META_COLLECTION)
      .doc(LEADERBOARD_DOC)
      .set({
        users: [
          {
            userId: 'public-user',
            displayName: 'Jane',
            email: PUBLIC_EMAIL,
            photoUrl: '',
            public: true,
            biteCount: 12,
          },
        ],
      });

    const baseline = await readPersistedLeaderboard(getFirestore());

    expect(JSON.stringify(baseline)).not.toMatch(/email|@example\.com/);
    expect(JSON.stringify(await memberReads(LEADERBOARD_DOC))).not.toMatch(
      /email|@example\.com/,
    );
  });
});
