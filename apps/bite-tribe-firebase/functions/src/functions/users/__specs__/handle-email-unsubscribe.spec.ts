import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  onRequest: jest.fn((handler) => handler),
}));

import {
  handleEmailUnsubscribeRequest,
  tokenFromPath,
} from '../handle-email-unsubscribe';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';
const PATH = `/unsubscribe/${TOKEN}`;

describe('handleEmailUnsubscribeRequest', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`emailOptOuts/${TOKEN}`, { uid: 'user-1' });
  });

  it('only asks on a GET, so a mail scanner opening the link changes nothing', async () => {
    const response = await handleEmailUnsubscribeRequest({
      method: 'GET',
      path: PATH,
    });

    expect(response.status).toBe(200);
    expect(response.html).toContain('<form method="post"');
    expect(db.read('settings/user-1')).toBeUndefined();
  });

  it('opts out on a POST, and keeps the rest of the settings', async () => {
    db.seed('settings/user-1', { language: 'de' });

    const response = await handleEmailUnsubscribeRequest({
      method: 'POST',
      path: PATH,
    });

    expect(response.status).toBe(200);
    expect(response.html).toContain('Du hast dich abgemeldet.');
    expect(db.read('settings/user-1')).toEqual({
      language: 'de',
      productEmails: false,
    });
  });

  it('refuses a token nobody issued', async () => {
    const response = await handleEmailUnsubscribeRequest({
      method: 'POST',
      path: '/unsubscribe/zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    });

    expect(response.status).toBe(404);
    expect(response.html).toContain('no longer valid');
  });
});

describe('tokenFromPath', () => {
  it('reads the one segment after the prefix', () => {
    expect(tokenFromPath(PATH)).toBe(TOKEN);
    expect(tokenFromPath('/unsubscribe/')).toBe('');
    expect(tokenFromPath(`/unsubscribe/${TOKEN}/extra`)).toBe('');
    expect(tokenFromPath(`/s/${TOKEN}`)).toBe('');
  });
});
