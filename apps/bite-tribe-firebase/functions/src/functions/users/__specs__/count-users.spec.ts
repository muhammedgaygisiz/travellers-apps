const countGetMock = jest.fn();
const collectionMock = jest.fn(() => ({
  count: (): { get: jest.Mock } => ({ get: countGetMock }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): any => ({ collection: collectionMock }),
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
  onCall: jest.fn((_options, handler) => handler),
}));

import { countUsers } from '../count-users';

const call = countUsers as unknown as (request: unknown) => Promise<number>;

const asMember = { auth: { uid: 'member', token: {} } };

describe('countUsers (issue #1863)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    countGetMock.mockResolvedValue({ data: () => ({ count: 42 }) });
  });

  it('counts every account, private ones included', async () => {
    await expect(call(asMember)).resolves.toBe(42);
    expect(collectionMock).toHaveBeenCalledWith('users');
  });

  it('refuses a signed-out caller', async () => {
    await expect(call({})).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(countGetMock).not.toHaveBeenCalled();
  });

  it('refuses an anonymous table guest', async () => {
    await expect(
      call({
        auth: {
          uid: 'guest',
          token: { firebase: { sign_in_provider: 'anonymous' } },
        },
      }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(countGetMock).not.toHaveBeenCalled();
  });
});
