const claimGetMock = jest.fn();
const docMock = jest.fn(() => ({ get: claimGetMock }));
const normalizedQueryGetMock = jest.fn();
const exactQueryGetMock = jest.fn();
const limitMock = jest.fn();
const whereMock = jest.fn((field: string) => ({
  limit: limitMock.mockReturnValue({
    get:
      field === 'normalizedDisplayName'
        ? normalizedQueryGetMock
        : exactQueryGetMock,
  }),
}));
const collectionMock = jest.fn(() => ({ doc: docMock, where: whereMock }));

jest.mock('firebase-admin', () => ({
  firestore: (): any => ({ collection: collectionMock }),
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

import {
  checkDisplayNameAvailabilityForUser,
  checkDisplayNameAvailabilityHandler,
} from '../check-display-name-availability';

const NO_CLAIM = { exists: false, data: (): undefined => undefined };

const claimedBy = (
  userId: string,
): { exists: boolean; data: () => Record<string, string> } => ({
  exists: true,
  data: (): Record<string, string> => ({ userId }),
});

/** Result shape of a `/users` query: only the doc ids are inspected. */
const usersHolding = (...uids: string[]): { docs: { id: string }[] } => ({
  docs: uids.map((id) => ({ id })),
});

beforeEach(() => {
  jest.clearAllMocks();
  claimGetMock.mockResolvedValue(NO_CLAIM);
  normalizedQueryGetMock.mockResolvedValue(usersHolding());
  exactQueryGetMock.mockResolvedValue(usersHolding());
});

describe('checkDisplayNameAvailabilityForUser', () => {
  it('reports an unclaimed name as available', async () => {
    await expect(
      checkDisplayNameAvailabilityForUser('user-1', 'Foodie'),
    ).resolves.toEqual({ available: true, normalizedDisplayName: 'foodie' });
  });

  it('treats a name the caller already claimed as available', async () => {
    claimGetMock.mockResolvedValue(claimedBy('user-1'));
    normalizedQueryGetMock.mockResolvedValue(usersHolding('user-1'));
    exactQueryGetMock.mockResolvedValue(usersHolding('user-1'));

    await expect(
      checkDisplayNameAvailabilityForUser('user-1', 'Foodie'),
    ).resolves.toEqual({ available: true, normalizedDisplayName: 'foodie' });
  });

  it('reports a name claimed by another user as taken', async () => {
    claimGetMock.mockResolvedValue(claimedBy('other-user'));

    await expect(
      checkDisplayNameAvailabilityForUser('user-1', 'Foodie'),
    ).resolves.toEqual({ available: false, normalizedDisplayName: 'foodie' });
  });

  it('reports a legacy name another user holds without a claim as taken', async () => {
    normalizedQueryGetMock.mockResolvedValue(usersHolding('other-user'));

    await expect(
      checkDisplayNameAvailabilityForUser('user-1', 'Foodie'),
    ).resolves.toEqual({ available: false, normalizedDisplayName: 'foodie' });
  });

  it('reports a legacy name matching another user exactly as taken', async () => {
    // Older profiles may have no normalizedDisplayName field at all, so the
    // exact displayName match is the only thing that catches them.
    exactQueryGetMock.mockResolvedValue(usersHolding('other-user'));

    await expect(
      checkDisplayNameAvailabilityForUser('user-1', 'Foodie'),
    ).resolves.toEqual({ available: false, normalizedDisplayName: 'foodie' });
  });

  it('treats the callers own legacy name as available', async () => {
    normalizedQueryGetMock.mockResolvedValue(usersHolding('user-1'));
    exactQueryGetMock.mockResolvedValue(usersHolding('user-1'));

    await expect(
      checkDisplayNameAvailabilityForUser('user-1', 'Foodie'),
    ).resolves.toEqual({ available: true, normalizedDisplayName: 'foodie' });
  });

  it('rejects an invalid name without reading firestore', async () => {
    await expect(
      checkDisplayNameAvailabilityForUser('user-1', '   '),
    ).resolves.toEqual({ available: false, normalizedDisplayName: '' });
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('normalizes case and whitespace before looking the name up', async () => {
    await checkDisplayNameAvailabilityForUser('user-1', '  Foodie  ');

    expect(docMock).toHaveBeenCalledWith('foodie');
    expect(whereMock).toHaveBeenCalledWith(
      'normalizedDisplayName',
      '==',
      'foodie',
    );
    expect(whereMock).toHaveBeenCalledWith('displayName', '==', 'Foodie');
  });
});

describe('checkDisplayNameAvailabilityHandler', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(
      checkDisplayNameAvailabilityHandler({
        data: { displayName: 'Foodie' },
      } as any),
    ).rejects.toThrow(
      'You must be signed in to check display name availability.',
    );
  });

  it('rejects a non-string display name', async () => {
    await expect(
      checkDisplayNameAvailabilityHandler({
        auth: { uid: 'user-1' },
        data: {},
      } as any),
    ).rejects.toThrow('invalid_display_name');
  });

  it('checks the name for the authenticated caller', async () => {
    claimGetMock.mockResolvedValue(claimedBy('other-user'));

    await expect(
      checkDisplayNameAvailabilityHandler({
        auth: { uid: 'user-1' },
        data: { displayName: 'Foodie' },
      } as any),
    ).resolves.toEqual({ available: false, normalizedDisplayName: 'foodie' });
  });
});
