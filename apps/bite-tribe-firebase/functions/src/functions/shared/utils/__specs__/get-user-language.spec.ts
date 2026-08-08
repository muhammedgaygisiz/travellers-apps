import type { FakeFirestore } from '../../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../../users/__specs__/fake-firestore';
import { getUserLanguage } from '../get-user-language';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

describe('getUserLanguage', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('reads the language the user picked in settings', async () => {
    db.seed('settings/user-1', { language: 'de' });

    await expect(getUserLanguage('user-1')).resolves.toBe('de');
  });

  it('defaults to English for an account that never opened settings', async () => {
    await expect(getUserLanguage('user-1')).resolves.toBe('en');
  });

  it('defaults to English for a settings document without a language', async () => {
    db.seed('settings/user-1', { currency: 'CHF' });

    await expect(getUserLanguage('user-1')).resolves.toBe('en');
  });

  it('defaults to English for a language the app does not offer', async () => {
    db.seed('settings/user-1', { language: 'kl' });

    await expect(getUserLanguage('user-1')).resolves.toBe('en');
  });

  it('resolves a stored locale with a region subtag to its base language', async () => {
    db.seed('settings/user-1', { language: 'de-CH' });

    await expect(getUserLanguage('user-1')).resolves.toBe('de');
  });
});
