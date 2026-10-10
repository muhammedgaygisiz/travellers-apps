import { geohashForLocation, Geopoint } from 'geofire-common';
import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;
const disabledUids = new Set<string>();
const missingUids = new Set<string>();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({
    getUsers: async (identifiers: { uid: string }[]) => ({
      users: identifiers
        .filter(({ uid }) => !missingUids.has(uid))
        .map(({ uid }) => ({ uid, disabled: disabledUids.has(uid) })),
    }),
  }),
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
  onCall: jest.fn((_options, handler) => handler),
}));

import {
  ACTIVE_WITHIN_MS,
  FollowSuggestion,
  isEligibleSuggestion,
  MAX_SUGGESTIONS,
  suggestPeopleToFollow,
  suggestPeopleToFollowFor,
} from '../suggest-people-to-follow';

const NOW = new Date('2026-10-08T12:00:00.000Z').getTime();
const DAY = 24 * 60 * 60 * 1000;
const VIEWER = 'viewer';
const BERN: Geopoint = [46.948, 7.4474];
/** About 2km from the centre of Bern: inside the 10km horizon. */
const NEAR_BERN: Geopoint = [46.96, 7.46];
/** Zurich: outside it. */
const ZURICH: Geopoint = [47.3769, 8.5417];

const aCreator = (
  uid: string,
  overrides: Record<string, unknown> = {},
): void => {
  db.seed(`users/${uid}`, {
    userId: uid,
    displayName: uid.toUpperCase(),
    photoUrl: `https://example.com/${uid}.jpg`,
    public: true,
    biteCount: 3,
    lastSeenTimestamp: NOW - DAY,
    ...overrides,
  });
};

let biteNumber = 0;

const aBite = (
  userId: string | undefined,
  [latitude, longitude]: Geopoint,
  overrides: Record<string, unknown> = {},
): void => {
  biteNumber += 1;
  db.seed(`bites/bite-${biteNumber}`, {
    ...(userId ? { userId } : {}),
    imageStatus: 'uploaded',
    position: { latitude, longitude },
    geohash: geohashForLocation([latitude, longitude]),
    ...overrides,
  });
};

const following = (uid: string): void => {
  db.seed(`users/${VIEWER}/following/${uid}`, { followedUid: uid });
};

const suggest = (center?: Geopoint): Promise<FollowSuggestion[]> =>
  suggestPeopleToFollowFor(db as never, VIEWER, center, NOW);

const ids = (suggestions: { userId: string }[]): string[] =>
  suggestions.map(({ userId }) => userId);

beforeEach(() => {
  db = createFakeFirestore();
  disabledUids.clear();
  missingUids.clear();
  biteNumber = 0;
  aCreator(VIEWER);
});

describe('isEligibleSuggestion', () => {
  const profile = {
    displayName: 'Leela',
    public: true,
    biteCount: 1,
    lastSeenTimestamp: NOW - DAY,
  };

  it('accepts a public, named, recently seen person with a Bite', () => {
    expect(isEligibleSuggestion(profile, NOW)).toBe(true);
  });

  it.each([
    ['a private profile', { public: false }],
    ['a profile with no visibility choice', { public: undefined }],
    ['a profile without Bites', { biteCount: 0 }],
    ['a profile without a display name', { displayName: '  ' }],
    ['a profile never seen', { lastSeenTimestamp: undefined }],
    [
      'a profile not seen for longer than the window',
      { lastSeenTimestamp: NOW - ACTIVE_WITHIN_MS - 1 },
    ],
  ])('refuses %s', (_label, overrides) => {
    expect(isEligibleSuggestion({ ...profile, ...overrides }, NOW)).toBe(false);
  });
});

describe('suggestPeopleToFollowFor', () => {
  it('never suggests the viewer, nor anyone they already follow', async () => {
    aCreator('ana');
    aCreator('ben');
    following('ben');
    aBite(VIEWER, NEAR_BERN);
    aBite('ben', NEAR_BERN);
    db.seed('config/newUserFollowUp', { userIds: [VIEWER, 'ben'] });

    expect(ids(await suggest(BERN))).toEqual(['ana']);
  });

  // GitHub issue #1609: a blocked account appears to the blocker nowhere.
  it('never suggests an account the viewer blocked', async () => {
    aCreator('ana');
    aCreator('blocked');
    aBite('blocked', NEAR_BERN);
    db.seed(`users/${VIEWER}/blocked/blocked`, { blockedUid: 'blocked' });
    db.seed('config/newUserFollowUp', { userIds: ['blocked'] });

    expect(ids(await suggest(BERN))).toEqual(['ana']);
  });

  it('never suggests a private profile or one without Bites', async () => {
    aCreator('private', { public: false });
    aCreator('empty', { biteCount: 0 });
    aCreator('ana');
    aBite('private', NEAR_BERN);

    expect(ids(await suggest(BERN))).toEqual(['ana']);
  });

  it('ranks nearby creators first, by how many Bites they have nearby', async () => {
    aCreator('top', { biteCount: 90 });
    aCreator('one-nearby');
    aCreator('two-nearby');
    aCreator('far');
    aBite('one-nearby', NEAR_BERN);
    aBite('two-nearby', NEAR_BERN);
    aBite('two-nearby', BERN);
    aBite('far', ZURICH);

    const suggestions = await suggest(BERN);

    expect(ids(suggestions).slice(0, 2)).toEqual(['two-nearby', 'one-nearby']);
    expect(suggestions[0].reason).toBe('nearby');
    expect(suggestions.find(({ userId }) => userId === 'far')?.reason).not.toBe(
      'nearby',
    );
  });

  it('ignores Bites whose photo never arrived and Bites without a creator', async () => {
    aCreator('pending');
    aBite('pending', NEAR_BERN, { imageStatus: 'pending' });
    aBite(undefined, NEAR_BERN);

    const suggestions = await suggest(BERN);

    expect(suggestions.some(({ reason }) => reason === 'nearby')).toBe(false);
  });

  it('falls back to the curated picks, then to the most active accounts', async () => {
    aCreator('active');
    aCreator('curated');
    db.seed('config/newUserFollowUp', { userIds: ['curated'] });

    const suggestions = await suggest();

    expect(
      suggestions.map(({ userId, reason }) => `${userId}:${reason}`),
    ).toEqual(['curated:curated', 'active:active']);
  });

  it('lists a person once, under the first tier that names them', async () => {
    aCreator('ana');
    aBite('ana', NEAR_BERN);
    db.seed('config/newUserFollowUp', { userIds: ['ana'] });

    const suggestions = await suggest(BERN);

    expect(suggestions).toEqual([
      {
        userId: 'ana',
        displayName: 'ANA',
        photoUrl: 'https://example.com/ana.jpg',
        biteCount: 3,
        reason: 'nearby',
      },
    ]);
  });

  it('drops blocked and deleted accounts without leaving the list short', async () => {
    for (let i = 0; i < MAX_SUGGESTIONS + 2; i += 1) {
      aCreator(`creator-${i}`);
    }
    disabledUids.add('creator-0');
    missingUids.add('creator-1');

    const suggestions = await suggest();

    expect(suggestions).toHaveLength(MAX_SUGGESTIONS);
    expect(ids(suggestions)).not.toContain('creator-0');
    expect(ids(suggestions)).not.toContain('creator-1');
  });

  it('answers with nothing when nobody qualifies', async () => {
    expect(await suggest(BERN)).toEqual([]);
  });

  it('leaves out a photo that is not an absolute https URL', async () => {
    aCreator('ana', { photoUrl: 'profile/ana.jpg' });

    expect((await suggest())[0]).not.toHaveProperty('photoUrl');
  });
});

describe('suggestPeopleToFollow', () => {
  const call = (
    data: Record<string, unknown>,
    auth?: unknown,
  ): Promise<unknown> =>
    (
      suggestPeopleToFollow as unknown as (request: unknown) => Promise<unknown>
    )({ data, auth });
  const member = {
    uid: VIEWER,
    token: { firebase: { sign_in_provider: 'password' } },
  };

  it('refuses a caller without an account', async () => {
    await expect(call({})).rejects.toBeTruthy();
  });

  it('refuses half a position', async () => {
    await expect(call({ latitude: 46.9 }, member)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('answers a member without a position', async () => {
    aCreator('ana', { lastSeenTimestamp: Date.now() });

    await expect(call({}, member)).resolves.toEqual([
      expect.objectContaining({ userId: 'ana', reason: 'active' }),
    ]);
  });
});
