import type { Firestore } from 'firebase-admin/firestore';
import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';
import { createTranslate } from '../../shared/i18n/translate';

const sendLocalizedNotification = jest.fn();

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: (...args: unknown[]): unknown =>
    sendLocalizedNotification(...args),
}));

import { notifyTaggedUsers } from '../notify-tagged-users';

type Request = {
  uids: string[];
  data: Record<string, string>;
  buildMessage: (translate: ReturnType<typeof createTranslate>) => {
    title: string;
    body: string;
  };
};

describe('notifyTaggedUsers', () => {
  let db: FakeFirestore;

  const send = async (creator: Record<string, unknown>): Promise<Request> => {
    db.seed('users/creator-1', creator);
    await notifyTaggedUsers(
      db as unknown as Firestore,
      'bite-1',
      { userId: 'creator-1', name: 'Ramen' },
      ['friend-1', 'friend-2'],
    );

    return sendLocalizedNotification.mock.calls[0][0] as Request;
  };

  beforeEach(() => {
    db = createFakeFirestore();
    sendLocalizedNotification.mockReset().mockResolvedValue(undefined);
  });

  it('sends BITE_TAGGED for the Bite to the given users', async () => {
    const request = await send({ public: true, displayName: 'Leela' });

    expect(request.uids).toEqual(['friend-1', 'friend-2']);
    expect(request.data).toEqual({ type: 'BITE_TAGGED', biteId: 'bite-1' });
    expect(request.buildMessage(createTranslate('en'))).toEqual({
      title: 'You were tagged in a Bite',
      body: 'Leela tagged you in a Bite: Ramen',
    });
  });

  it('writes in the recipient language', async () => {
    const request = await send({ public: true, displayName: 'Leela' });

    expect(request.buildMessage(createTranslate('de')).body).toBe(
      'Leela hat dich in einem Bite markiert: Ramen',
    );
  });

  it('does not name a private creator', async () => {
    const request = await send({ public: false, displayName: 'Leela' });

    expect(request.buildMessage(createTranslate('en')).body).toBe(
      'Someone tagged you in a Bite: Ramen',
    );
  });
});
