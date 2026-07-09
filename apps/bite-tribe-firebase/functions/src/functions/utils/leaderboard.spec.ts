import {
  buildLeaderboardNotificationBody,
  computeRankChanges,
  isPublicUser,
  LeaderboardUser,
  toLeaderboardUser,
} from './leaderboard';

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({})),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const asDoc = (id: string, data: Record<string, unknown>): any =>
  ({
    id,
    data: () => data,
  }) as any;

const asLeaderboardUser = (userId: string): LeaderboardUser => ({
  userId,
  displayName: userId,
  email: '',
  photoUrl: '',
  public: true,
  biteCount: 0,
});

const asRanking = (userIds: string[]): LeaderboardUser[] =>
  userIds.map(asLeaderboardUser);

describe('isPublicUser', () => {
  it('accepts users with public set to true', () => {
    expect(isPublicUser(asDoc('doc-id', { public: true }))).toBe(true);
  });

  it('rejects anonymous users', () => {
    expect(isPublicUser(asDoc('doc-id', { public: false }))).toBe(false);
    expect(isPublicUser(asDoc('doc-id', {}))).toBe(false);
    expect(isPublicUser(asDoc('doc-id', { public: 'true' }))).toBe(false);
  });
});

describe('toLeaderboardUser', () => {
  it('exposes the full profile for public users', () => {
    const doc = asDoc('doc-id', {
      userId: 'user-1',
      displayName: 'Jane',
      email: 'jane@example.com',
      photoUrl: 'https://example.com/jane.png',
      city: 'Zurich',
      public: true,
      biteCount: 12,
    });

    expect(toLeaderboardUser(doc)).toEqual({
      userId: 'user-1',
      displayName: 'Jane',
      email: 'jane@example.com',
      photoUrl: 'https://example.com/jane.png',
      city: 'Zurich',
      public: true,
      biteCount: 12,
    });
  });

  it('anonymises non-public users but keeps their bite count', () => {
    const doc = asDoc('doc-id', {
      userId: 'user-2',
      displayName: 'John',
      email: 'john@example.com',
      photoUrl: 'https://example.com/john.png',
      city: 'Bern',
      public: false,
      biteCount: 7,
    });

    expect(toLeaderboardUser(doc)).toEqual({
      userId: 'user-2',
      displayName: '',
      email: '',
      photoUrl: '',
      public: false,
      biteCount: 7,
    });
  });

  it('falls back to the document id and zero bites when fields are missing', () => {
    const doc = asDoc('doc-id', { public: true });

    expect(toLeaderboardUser(doc)).toEqual({
      userId: 'doc-id',
      displayName: '',
      email: '',
      photoUrl: '',
      public: true,
      biteCount: 0,
    });
  });
});

describe('computeRankChanges', () => {
  it('returns no changes when the ranking is identical', () => {
    const ranking = asRanking(['user-1', 'user-2', 'user-3']);

    expect(computeRankChanges(ranking, ranking)).toEqual([]);
  });

  it('reports a user who climbed up', () => {
    const previous = asRanking(['user-1', 'user-2', 'user-3']);
    const current = asRanking(['user-2', 'user-1', 'user-3']);

    expect(computeRankChanges(previous, current)).toEqual([
      { userId: 'user-2', previousRank: 2, currentRank: 1, direction: 'up' },
      { userId: 'user-1', previousRank: 1, currentRank: 2, direction: 'down' },
    ]);
  });

  it('reports a new entrant as climbing up', () => {
    const previous = asRanking(['user-1', 'user-2']);
    const current = asRanking(['user-1', 'user-3', 'user-2']);

    expect(computeRankChanges(previous, current)).toEqual([
      { userId: 'user-3', previousRank: null, currentRank: 2, direction: 'up' },
      { userId: 'user-2', previousRank: 2, currentRank: 3, direction: 'down' },
    ]);
  });

  it('reports a user who dropped out of the ranking', () => {
    const previous = asRanking(['user-1', 'user-2', 'user-3']);
    const current = asRanking(['user-1', 'user-2']);

    expect(computeRankChanges(previous, current)).toEqual([
      {
        userId: 'user-3',
        previousRank: 3,
        currentRank: null,
        direction: 'down',
      },
    ]);
  });

  it('ignores users with an empty id', () => {
    const previous = asRanking(['', 'user-1']);
    const current = asRanking(['user-1', '']);

    expect(computeRankChanges(previous, current)).toEqual([
      { userId: 'user-1', previousRank: 2, currentRank: 1, direction: 'up' },
    ]);
  });
});

describe('buildLeaderboardNotificationBody', () => {
  it('describes a user who climbed up', () => {
    expect(
      buildLeaderboardNotificationBody({
        userId: 'user-1',
        previousRank: 5,
        currentRank: 2,
        direction: 'up',
      }),
    ).toBe('You climbed up to #2 on the leaderboard! 🎉');
  });

  it('describes a user who slipped down', () => {
    expect(
      buildLeaderboardNotificationBody({
        userId: 'user-1',
        previousRank: 2,
        currentRank: 5,
        direction: 'down',
      }),
    ).toBe('You dropped to #5 on the leaderboard.');
  });

  it('describes a new entrant', () => {
    expect(
      buildLeaderboardNotificationBody({
        userId: 'user-1',
        previousRank: null,
        currentRank: 8,
        direction: 'up',
      }),
    ).toBe('You entered the top 10 at #8 on the leaderboard! 🎉');
  });

  it('describes a user who dropped out of the top 10', () => {
    expect(
      buildLeaderboardNotificationBody({
        userId: 'user-1',
        previousRank: 10,
        currentRank: null,
        direction: 'down',
      }),
    ).toBe('You dropped out of the top 10 on the leaderboard.');
  });
});
