import type { FakeFirestore } from '../../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../../users/__specs__/fake-firestore';
import type { UserPushToken } from '../get-tokens';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/**
 * The module under test grabs its Firestore handle at import time, so it is
 * re-imported per test against a freshly seeded store.
 */
const getTokens = (uids: string[]): Promise<UserPushToken[]> =>
  (require('../get-tokens') as typeof import('../get-tokens')).getTokens(uids);

describe('getTokens', () => {
  beforeEach(() => {
    jest.resetModules();
    db = createFakeFirestore();
  });

  it('returns the enabled tokens of a user with their owner', async () => {
    db.seed('users/user-1/pushTokens/token-a', {
      enabled: true,
      installationId: 'installation-a',
    });

    await expect(getTokens(['user-1'])).resolves.toEqual([
      { uid: 'user-1', token: 'token-a' },
    ]);
  });

  it('skips an installation the user disabled', async () => {
    // Disabling one installation is the only control the settings page has, so
    // it has to be what stops delivery here (issue #1184).
    db.seed('users/user-1/pushTokens/token-a', {
      enabled: false,
      installationId: 'installation-a',
    });

    await expect(getTokens(['user-1'])).resolves.toEqual([]);
  });

  it('keeps delivering to the other installations of the same account', async () => {
    db.seed('users/user-1/pushTokens/token-a', {
      enabled: false,
      installationId: 'installation-a',
    });
    db.seed('users/user-1/pushTokens/token-b', {
      enabled: true,
      installationId: 'installation-b',
    });

    await expect(getTokens(['user-1'])).resolves.toEqual([
      { uid: 'user-1', token: 'token-b' },
    ]);
  });

  it('delivers to a legacy token that has no enabled flag', async () => {
    // Tokens registered before the flag existed must not go silent.
    db.seed('users/user-1/pushTokens/legacy-token', { platform: 'ios' });

    await expect(getTokens(['user-1'])).resolves.toEqual([
      { uid: 'user-1', token: 'legacy-token', platform: 'ios' },
    ]);
  });

  it('reports the platform an installation registered from', async () => {
    // A release announcement addresses one store at a time (issue #1194), so
    // the platform has to survive token collection.
    db.seed('users/user-1/pushTokens/token-a', {
      enabled: true,
      platform: 'android',
    });

    await expect(getTokens(['user-1'])).resolves.toEqual([
      { uid: 'user-1', token: 'token-a', platform: 'android' },
    ]);
  });

  it('leaves the platform undefined when the document never recorded one', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });

    await expect(getTokens(['user-1'])).resolves.toEqual([
      { uid: 'user-1', token: 'token-a', platform: undefined },
    ]);
  });

  it('collects the tokens of every requested user', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('users/user-2/pushTokens/token-b', { enabled: true });

    await expect(getTokens(['user-1', 'user-2'])).resolves.toEqual([
      { uid: 'user-1', token: 'token-a' },
      { uid: 'user-2', token: 'token-b' },
    ]);
  });

  it('returns nothing for a user without registered installations', async () => {
    await expect(getTokens(['user-1'])).resolves.toEqual([]);
  });
});
