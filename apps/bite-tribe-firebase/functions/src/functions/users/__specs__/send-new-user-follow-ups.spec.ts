import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';
import type { RenderedEmail } from '../google-workspace-email';

let db: FakeFirestore;
const getUsersMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({ getUsers: getUsersMock }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({ name })),
}));

import {
  NEW_USER_FOLLOW_UPS_COLLECTION,
  sendNewUserFollowUpsForWindow,
} from '../send-new-user-follow-ups';

const NOW = new Date('2026-09-28T16:00:00.000Z');
const HOUR = 60 * 60 * 1000;
/** Signed up yesterday: inside the 24-49 hour window. */
const YESTERDAY = NOW.getTime() - 30 * HOUR;

interface AuthUserOverrides {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  providerIds?: string[];
}

const authUsers = new Map<string, unknown>();

const anAuthUser = ({
  uid,
  email = `${uid}@example.com`,
  emailVerified = true,
  disabled = false,
  providerIds = ['password'],
}: AuthUserOverrides): void => {
  authUsers.set(uid, {
    uid,
    email,
    emailVerified,
    disabled,
    providerData: providerIds.map((providerId) => ({ providerId })),
  });
};

const aNewUser = (
  overrides: AuthUserOverrides,
  createdAtTimestamp = YESTERDAY,
): void => {
  db.seed(`users/${overrides.uid}`, {
    userId: overrides.uid,
    createdAtTimestamp,
  });
  anAuthUser(overrides);
};

const seedPicks = (): void => {
  db.seed('config/newUserFollowUp', {
    biteIds: ['bite-1', 'bite-gone'],
    userIds: ['creator-1', 'private-1'],
  });
  db.seed('bites/bite-1', {
    name: 'Pad Thai',
    place: 'China Wok',
    imagePath: 'https://example.com/pad-thai.jpg',
  });
  db.seed('users/creator-1', {
    displayName: 'Leela',
    public: true,
    createdAtTimestamp: NOW.getTime() - 400 * HOUR,
  });
  db.seed('users/private-1', {
    displayName: 'Hidden',
    public: false,
    createdAtTimestamp: NOW.getTime() - 400 * HOUR,
  });
};

const decodeHtml = (email: RenderedEmail): string => email.html;

describe('sendNewUserFollowUpsForWindow', () => {
  let sendEmail: jest.Mock<Promise<void>, [RenderedEmail]>;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createFakeFirestore();
    authUsers.clear();
    sendEmail = jest.fn(async () => undefined);
    getUsersMock.mockImplementation(async (ids: { uid: string }[]) => ({
      users: ids.flatMap(({ uid }) =>
        authUsers.has(uid) ? [authUsers.get(uid)] : [],
      ),
      notFound: [],
    }));
    seedPicks();
  });

  it('mails a verified new user once, showing only the picks that resolve', async () => {
    aNewUser({ uid: 'new-1' });

    const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(summary).toEqual({
      candidates: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
      monitored: 0,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const [email] = sendEmail.mock.calls[0];
    const html = decodeHtml(email);

    expect(email.to).toBe('new-1@example.com');
    expect(html).toContain('Pad Thai');
    expect(html).toContain('Leela');
    expect(html).not.toContain('Hidden');
    expect(html).toContain(
      'https://bitetribe.app/bite/bite-1?utm_source=bitetribe&amp;utm_medium=email&amp;utm_campaign=new_user_follow_up',
    );
    expect(db.read(`${NEW_USER_FOLLOW_UPS_COLLECTION}/new-1`)).toEqual(
      expect.objectContaining({ status: 'sent', sentAt: NOW.toISOString() }),
    );
  });

  it('never mails the same account twice, even across overlapping runs', async () => {
    aNewUser({ uid: 'new-1' });

    await sendNewUserFollowUpsForWindow(NOW, sendEmail);
    const second = await sendNewUserFollowUpsForWindow(
      new Date(NOW.getTime() + HOUR / 2),
      sendEmail,
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(second.skipped).toBe(1);
  });

  it('skips unverified, disabled and provider-less accounts without claiming them', async () => {
    aNewUser({ uid: 'unverified', emailVerified: false });
    aNewUser({ uid: 'disabled', disabled: true });
    aNewUser({ uid: 'guest', providerIds: [] });

    const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(3);
    expect(db.exists(`${NEW_USER_FOLLOW_UPS_COLLECTION}/unverified`)).toBe(
      false,
    );
  });

  it('respects an opt-out of product mail', async () => {
    aNewUser({ uid: 'new-1' });
    db.seed('settings/new-1', { productEmails: false });

    await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('only reads accounts that signed up 24 to 49 hours ago', async () => {
    aNewUser({ uid: 'today' }, NOW.getTime() - 2 * HOUR);
    aNewUser({ uid: 'last-week' }, NOW.getTime() - 7 * 24 * HOUR);

    const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(summary.candidates).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends in the language the user chose', async () => {
    aNewUser({ uid: 'new-1' });
    db.seed('settings/new-1', { language: 'de' });

    await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(sendEmail.mock.calls[0][0].subject).toBe(
      'Gerichte und Foodies für dich ausgewählt',
    );
  });

  it('carries an unsubscribe link backed by a stored token', async () => {
    aNewUser({ uid: 'new-1' });

    await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    const [email] = sendEmail.mock.calls[0];
    const url = /^<(.+)>$/.exec(email.headers?.['List-Unsubscribe'] ?? '')?.[1];
    const token = url?.split('/unsubscribe/')[1] ?? '';

    expect(url).toMatch(/^https:\/\/bitetribe\.app\/unsubscribe\//);
    expect(email.headers?.['List-Unsubscribe-Post']).toBe(
      'List-Unsubscribe=One-Click',
    );
    expect(db.read(`emailOptOuts/${token}`)).toEqual(
      expect.objectContaining({ uid: 'new-1' }),
    );
  });

  it('does not suggest following yourself', async () => {
    db.seed('users/creator-1', {
      displayName: 'Leela',
      public: true,
      createdAtTimestamp: YESTERDAY,
    });
    anAuthUser({ uid: 'creator-1' });

    await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(decodeHtml(sendEmail.mock.calls[0][0])).not.toContain('Leela');
  });

  it('sends nothing and claims nobody while no pick resolves', async () => {
    db.seed('config/newUserFollowUp', { biteIds: ['bite-gone'], userIds: [] });
    aNewUser({ uid: 'new-1' });

    const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(summary.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.exists(`${NEW_USER_FOLLOW_UPS_COLLECTION}/new-1`)).toBe(false);
  });

  it('keeps the claim when the send fails, so a retry cannot mail twice', async () => {
    aNewUser({ uid: 'new-1' });
    sendEmail.mockRejectedValueOnce(new Error('gmail down'));

    const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);
    await sendNewUserFollowUpsForWindow(NOW, sendEmail);

    expect(summary.failed).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(db.read(`${NEW_USER_FOLLOW_UPS_COLLECTION}/new-1`)).toEqual(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  describe('monitor copy', () => {
    const withMonitor = (): void => {
      db.seed('config/newUserFollowUp', {
        biteIds: ['bite-1'],
        userIds: ['creator-1'],
        monitorUids: ['creator-1'],
      });
      anAuthUser({ uid: 'creator-1', email: 'ops@example.com' });
    };

    it('mails the full picks with the run counts in the subject, every run', async () => {
      withMonitor();
      aNewUser({ uid: 'new-1' });

      const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);

      expect(summary.monitored).toBe(1);
      expect(sendEmail).toHaveBeenCalledTimes(2);

      const copy = sendEmail.mock.calls[1][0];

      expect(copy.to).toBe('ops@example.com');
      expect(copy.subject).toBe(
        '[Follow-up monitor] 1 sent, 0 skipped, 0 failed of 1 - Dishes and foodies picked for you',
      );
      // The monitor is a pick here; the copy still shows what new users see.
      expect(copy.html).toContain('Leela');
    });

    it('still arrives when nobody new was due, and claims nothing', async () => {
      withMonitor();

      await sendNewUserFollowUpsForWindow(NOW, sendEmail);
      await sendNewUserFollowUpsForWindow(NOW, sendEmail);

      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sendEmail.mock.calls[0][0].subject).toMatch(
        /^\[Follow-up monitor\] 0 sent, 0 skipped, 0 failed of 0 - /,
      );
      expect(db.exists(`${NEW_USER_FOLLOW_UPS_COLLECTION}/creator-1`)).toBe(
        false,
      );
    });

    it('alerts instead when no pick resolves', async () => {
      db.seed('config/newUserFollowUp', {
        biteIds: ['bite-gone'],
        monitorUids: ['creator-1'],
      });
      anAuthUser({ uid: 'creator-1', email: 'ops@example.com' });

      await sendNewUserFollowUpsForWindow(NOW, sendEmail);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0].subject).toBe(
        '[Follow-up monitor] No picks resolved - nothing sent',
      );
    });

    it('never fails the run when the copy cannot be sent', async () => {
      withMonitor();
      aNewUser({ uid: 'new-1' });
      sendEmail
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('gmail down'));

      const summary = await sendNewUserFollowUpsForWindow(NOW, sendEmail);

      expect(summary).toEqual(
        expect.objectContaining({ sent: 1, failed: 0, monitored: 0 }),
      );
    });
  });
});
