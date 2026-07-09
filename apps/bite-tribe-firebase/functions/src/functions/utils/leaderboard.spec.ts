import { isPublicUser, toLeaderboardUser } from './leaderboard';

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
