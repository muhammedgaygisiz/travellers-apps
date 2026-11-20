import type { Firestore } from 'firebase-admin/firestore';
import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';
import { createTranslate } from '../../shared/i18n/translate';
import { SUPPORTED_LANGUAGES } from '../../shared/i18n/supported-languages';

const sendLocalizedNotification = jest.fn();

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_document: unknown, handler: unknown) => handler),
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {},
}));

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: (...args: unknown[]): unknown =>
    sendLocalizedNotification(...args),
}));

import {
  notifyOwnerOfFollowRequest,
  notifyRequesterOfAcceptedFollowRequest,
} from '../notify-on-follow-request';
import { followRequestId } from '../../users/follow-request';

const OWNER = 'owner-1';
const REQUESTER = 'requester-1';
const REQUEST_ID = followRequestId(OWNER, REQUESTER);

type Request = {
  uids: string[];
  data: Record<string, string>;
  buildMessage: (translate: ReturnType<typeof createTranslate>) => {
    title: string;
    body: string;
  };
};

const sent = (): Request[] =>
  sendLocalizedNotification.mock.calls.map(([request]) => request as Request);

describe('notifyOwnerOfFollowRequest', () => {
  let db: FakeFirestore;

  const notify = (
    request: Record<string, unknown> = {
      ownerUid: OWNER,
      requesterUid: REQUESTER,
    },
    requestId = REQUEST_ID,
  ): Promise<void> =>
    notifyOwnerOfFollowRequest(db as unknown as Firestore, requestId, request);

  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${OWNER}`, { public: false, displayName: 'Owner' });
    sendLocalizedNotification.mockReset().mockResolvedValue(1);
  });

  it('sends the owner one push that names the requester and opens the requests page', async () => {
    db.seed(`users/${REQUESTER}`, { public: true, displayName: 'Leela' });

    await notify();

    expect(sent()).toHaveLength(1);
    expect(sent()[0].uids).toEqual([OWNER]);
    expect(sent()[0].data).toEqual({
      type: 'FOLLOW_REQUEST',
      requesterUid: REQUESTER,
    });
    expect(sent()[0].buildMessage(createTranslate('en'))).toEqual({
      title: 'New follow request',
      body: 'Leela asked to follow you.',
    });
  });

  it('names a private requester by display name only, never a real name', async () => {
    db.seed(`users/${REQUESTER}`, {
      public: false,
      displayName: 'Leela',
      name: 'Turanga Leela',
    });

    await notify();

    expect(sent()[0].buildMessage(createTranslate('en')).body).toBe(
      'Leela asked to follow you.',
    );
  });

  it('says Someone for a requester without a display name', async () => {
    db.seed(`users/${REQUESTER}`, { public: true, name: 'Turanga Leela' });

    await notify();

    expect(sent()[0].buildMessage(createTranslate('en')).body).toBe(
      'Someone asked to follow you.',
    );
  });

  it('writes in the recipient language', async () => {
    db.seed(`users/${REQUESTER}`, { public: true, displayName: 'Leela' });

    await notify();

    expect(sent()[0].buildMessage(createTranslate('de'))).toEqual({
      title: 'Neue Folgeanfrage',
      body: 'Leela möchte dir folgen.',
    });
  });

  it('sends nothing for a requester with no user document', async () => {
    await notify();

    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('sends nothing for a request whose id does not name its pair', async () => {
    db.seed(`users/${REQUESTER}`, { public: true, displayName: 'Leela' });

    await notify(
      { ownerUid: OWNER, requesterUid: REQUESTER },
      followRequestId('someone-else', REQUESTER),
    );
    await notify({ ownerUid: OWNER });

    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });
});

describe('notifyRequesterOfAcceptedFollowRequest', () => {
  let db: FakeFirestore;

  beforeEach(() => {
    db = createFakeFirestore();
    sendLocalizedNotification.mockReset().mockResolvedValue(1);
  });

  it("sends the requester one push that names the owner and opens the owner's profile", async () => {
    db.seed(`users/${OWNER}`, {
      public: false,
      displayName: 'Fry',
      name: 'Philip J. Fry',
    });

    await notifyRequesterOfAcceptedFollowRequest(
      db as unknown as Firestore,
      OWNER,
      REQUESTER,
    );

    expect(sent()).toHaveLength(1);
    expect(sent()[0].uids).toEqual([REQUESTER]);
    expect(sent()[0].data).toEqual({
      type: 'FOLLOW_REQUEST_ACCEPTED',
      ownerUid: OWNER,
    });
    expect(sent()[0].buildMessage(createTranslate('en'))).toEqual({
      title: 'Follow request accepted',
      body: 'Fry accepted your follow request.',
    });
  });

  it('says Someone for an owner without a display name', async () => {
    db.seed(`users/${OWNER}`, { public: false });

    await notifyRequesterOfAcceptedFollowRequest(
      db as unknown as Firestore,
      OWNER,
      REQUESTER,
    );

    expect(sent()[0].buildMessage(createTranslate('en')).body).toBe(
      'Someone accepted your follow request.',
    );
  });
});

describe('follow request copy', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'is translated and names the other party in %s',
    (language) => {
      const translate = createTranslate(language);
      const english = createTranslate('en');

      for (const key of [
        'followRequest.title',
        'followRequestAccepted.title',
      ] as const) {
        expect(translate(key).trim()).not.toBe('');
      }

      expect(translate('followRequest.body', { requester: 'Leela' })).toContain(
        'Leela',
      );
      expect(
        translate('followRequestAccepted.body', { owner: 'Fry' }),
      ).toContain('Fry');

      if (language !== 'en') {
        expect(translate('followRequest.title')).not.toBe(
          english('followRequest.title'),
        );
        expect(
          translate('followRequestAccepted.body', { owner: 'Fry' }),
        ).not.toBe(english('followRequestAccepted.body', { owner: 'Fry' }));
      }
    },
  );
});
