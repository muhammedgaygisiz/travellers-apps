import type { FakeFirestore } from '../../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../../users/__specs__/fake-firestore';
import type { LocalizedTokens } from '../get-tokens-by-language';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/**
 * Both the module under test and `get-tokens` grab their Firestore handle at
 * import time, so they are re-imported per test against a freshly seeded store.
 */
const getTokensByLanguage = (uids: string[]): Promise<LocalizedTokens[]> =>
  (
    require('../get-tokens-by-language') as typeof import('../get-tokens-by-language')
  ).getTokensByLanguage(uids);

describe('getTokensByLanguage', () => {
  beforeEach(() => {
    jest.resetModules();
    db = createFakeFirestore();
  });

  it('groups a token under the language the user picked in settings', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('settings/user-1', { language: 'de' });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([
      { language: 'de', tokens: ['token-a'] },
    ]);
  });

  it('gives every installation of an account the same language', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('users/user-1/pushTokens/token-b', { enabled: true });
    db.seed('settings/user-1', { language: 'fr' });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([
      { language: 'fr', tokens: ['token-a', 'token-b'] },
    ]);
  });

  it('splits recipients into one group per language', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('settings/user-1', { language: 'de' });
    db.seed('users/user-2/pushTokens/token-b', { enabled: true });
    db.seed('settings/user-2', { language: 'tr' });
    db.seed('users/user-3/pushTokens/token-c', { enabled: true });
    db.seed('settings/user-3', { language: 'de' });

    await expect(
      getTokensByLanguage(['user-1', 'user-2', 'user-3']),
    ).resolves.toEqual([
      { language: 'de', tokens: ['token-a', 'token-c'] },
      { language: 'tr', tokens: ['token-b'] },
    ]);
  });

  it('falls back to English for an account that never saved settings', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([
      { language: 'en', tokens: ['token-a'] },
    ]);
  });

  it('falls back to English for a language the catalog does not cover', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('settings/user-1', { language: 'kl' });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([
      { language: 'en', tokens: ['token-a'] },
    ]);
  });

  it('drops the region subtag of a stored locale', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('settings/user-1', { language: 'de-CH' });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([
      { language: 'de', tokens: ['token-a'] },
    ]);
  });

  it('ignores installations the user disabled', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: false });
    db.seed('settings/user-1', { language: 'de' });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([]);
  });

  it('returns no groups when nobody has a delivery address', async () => {
    db.seed('settings/user-1', { language: 'de' });

    await expect(getTokensByLanguage(['user-1'])).resolves.toEqual([]);
  });
});
