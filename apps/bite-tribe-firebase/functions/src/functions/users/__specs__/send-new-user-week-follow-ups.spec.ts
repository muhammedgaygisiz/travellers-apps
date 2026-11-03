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

import { NEW_USER_WEEK_FOLLOW_UPS_COLLECTION } from '../new-user-week-follow-up-picks';
import { sendNewUserWeekFollowUpsForDay } from '../send-new-user-week-follow-ups';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Tuesday 10 November 2026, 18:00 in Zurich (CET). */
const NOW = new Date('2026-11-10T17:00:00.000Z');
/** 10:00 Zurich on 3 November: day 7 is today. */
const SIGNED_UP = Date.parse('2026-11-03T09:00:00.000Z');
/** Midnight Zurich starting 5 November, the first moment of day 2. */
const DAY_TWO = Date.parse('2026-11-04T23:00:00.000Z');

interface AuthUserOverrides {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  providerIds?: string[];
  lastRefreshTime?: string | null;
}

const authUsers = new Map<string, unknown>();

const anAuthUser = ({
  uid,
  email = `${uid}@example.com`,
  emailVerified = true,
  disabled = false,
  providerIds = ['password'],
  lastRefreshTime = new Date(SIGNED_UP).toUTCString(),
}: AuthUserOverrides): void => {
  authUsers.set(uid, {
    uid,
    email,
    emailVerified,
    disabled,
    providerData: providerIds.map((providerId) => ({ providerId })),
    metadata: { lastRefreshTime },
  });
};

const aNewUser = (
  overrides: AuthUserOverrides,
  {
    createdAtTimestamp = SIGNED_UP,
    lastSeenTimestamp = SIGNED_UP,
  }: { createdAtTimestamp?: number; lastSeenTimestamp?: number } = {},
): void => {
  db.seed(`users/${overrides.uid}`, {
    userId: overrides.uid,
    createdAtTimestamp,
    lastSeenTimestamp,
  });
  anAuthUser(overrides);
};

const aBite = (
  id: string,
  userId: string,
  name: string,
  {
    createdAtTimestamp = NOW.getTime() - 2 * DAY,
    imageStatus = 'uploaded',
  }: { createdAtTimestamp?: number; imageStatus?: string } = {},
): void =>
  db.seed(`bites/${id}`, {
    userId,
    name,
    place: 'China Wok',
    imagePath: `https://example.com/${id}.jpg`,
    imageStatus,
    createdAtTimestamp,
  });

const anAccount = (uid: string, displayName: string, isPublic = true): void =>
  db.seed(`users/${uid}`, {
    displayName,
    public: isPublic,
    createdAtTimestamp: NOW.getTime() - 400 * DAY,
  });

const follows = (uid: string, followedUid: string): void =>
  db.seed(`users/${uid}/following/${followedUid}`, {});

/**
 * The fallback, with one pick the day-1 mail already showed in front so the
 * order alone would put it into every mail.
 */
const seedFallback = (): void => {
  db.seed('config/newUserFollowUp', { biteIds: ['day-one-pick'] });
  db.seed('config/newUserWeekFollowUp', {
    biteIds: ['day-one-pick', 'pick-1', 'pick-2', 'pick-3'],
  });
  anAccount('curator', 'Curator');
  aBite('day-one-pick', 'curator', 'Day One Dish');
  aBite('pick-1', 'curator', 'Pick One');
  aBite('pick-2', 'curator', 'Pick Two');
  aBite('pick-3', 'curator', 'Pick Three');
};

describe('sendNewUserWeekFollowUpsForDay', () => {
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
    seedFallback();
  });

  it('shows new Bites from followed accounts first and fills the rest from the fallback', async () => {
    aNewUser({ uid: 'new-1' });
    follows('new-1', 'leela');
    anAccount('leela', 'Leela');
    aBite('khao-soi', 'leela', 'Khao Soi');
    aBite('stale', 'leela', 'Stale Dish', {
      createdAtTimestamp: NOW.getTime() - 10 * DAY,
    });
    aBite('no-image', 'leela', 'Pending Dish', { imageStatus: 'pending' });
    follows('new-1', 'hidden');
    anAccount('hidden', 'Hidden', false);
    aBite('private-dish', 'hidden', 'Private Dish');

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(summary).toEqual({
      candidates: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
      monitored: 0,
    });

    const [email] = sendEmail.mock.calls[0];

    expect(email.to).toBe('new-1@example.com');
    expect(email.subject).toBe("What's new on BiteTribe this week");
    expect(email.html).toContain('New from people you follow');
    expect(email.html).toContain('Khao Soi');
    expect(email.html).toContain('Leela · China Wok');
    expect(email.html.indexOf('Khao Soi')).toBeLessThan(
      email.html.indexOf('Pick One'),
    );
    expect(email.html).toContain('Pick Two');
    expect(email.html).not.toContain('Pick Three');
    expect(email.html).not.toContain('Day One Dish');
    expect(email.html).not.toContain('Stale Dish');
    expect(email.html).not.toContain('Pending Dish');
    expect(email.html).not.toContain('Private Dish');
    expect(email.html).toContain(
      'https://bitetribe.app/bite/khao-soi?utm_source=bitetribe&amp;utm_medium=email&amp;utm_campaign=new_user_week_follow_up',
    );
    expect(db.read(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/new-1`)).toEqual(
      expect.objectContaining({ status: 'sent', sentAt: NOW.toISOString() }),
    );
  });

  it('sends three fallback Bites to a user whose followed accounts posted nothing', async () => {
    aNewUser({ uid: 'new-1' });

    await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    const { html } = sendEmail.mock.calls[0][0];

    expect(html).not.toContain('New from people you follow');
    expect(html).toContain('More dishes worth trying');
    expect(html).toContain('Pick One');
    expect(html).toContain('Pick Two');
    expect(html).toContain('Pick Three');
    expect(html).not.toContain('Day One Dish');
  });

  it('never offers a user their own Bite as a fallback', async () => {
    aNewUser({ uid: 'curator-new' });
    db.seed('config/newUserWeekFollowUp', { biteIds: ['own', 'pick-1'] });
    aBite('own', 'curator-new', 'My Own Dish');

    await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    const { html } = sendEmail.mock.calls[0][0];

    expect(html).not.toContain('My Own Dish');
    expect(html).toContain('Pick One');
  });

  it('leaves alone a user the app saw from day 2 on, without claiming them', async () => {
    aNewUser({ uid: 'back' }, { lastSeenTimestamp: DAY_TWO + HOUR });

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
    expect(db.exists(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/back`)).toBe(
      false,
    );
  });

  it('also counts a session Firebase Auth saw as coming back', async () => {
    aNewUser({
      uid: 'back',
      lastRefreshTime: new Date(DAY_TWO + 3 * DAY).toUTCString(),
    });

    await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('still mails a user who only came back on day 1', async () => {
    aNewUser(
      {
        uid: 'day-one',
        lastRefreshTime: new Date(DAY_TWO - HOUR).toUTCString(),
      },
      { lastSeenTimestamp: DAY_TWO - HOUR },
    );

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(summary.sent).toBe(1);
  });

  it('reads the Zurich calendar day seven days back, not the last 6 to 7 x 24 hours', async () => {
    // 23:30 Zurich on 3 November: 6 days and 18.5 hours ago, still day 7.
    aNewUser(
      { uid: 'late' },
      { createdAtTimestamp: Date.parse('2026-11-03T22:30:00.000Z') },
    );
    // 08:00 Zurich on 4 November: 6 days and 10 hours ago, but day 6.
    aNewUser(
      { uid: 'day-six' },
      { createdAtTimestamp: Date.parse('2026-11-04T07:00:00.000Z') },
    );
    // 23:30 Zurich on 2 November: day 8.
    aNewUser(
      { uid: 'day-eight' },
      { createdAtTimestamp: Date.parse('2026-11-02T22:30:00.000Z') },
    );

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(summary.candidates).toBe(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('late@example.com');
  });

  it('never mails the same account twice, even when a late run repeats the day', async () => {
    aNewUser({ uid: 'new-1' });

    await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);
    const second = await sendNewUserWeekFollowUpsForDay(
      new Date(NOW.getTime() + HOUR),
      sendEmail,
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(second.skipped).toBe(1);
  });

  it('skips unverified, disabled and provider-less accounts, and opted-out ones', async () => {
    aNewUser({ uid: 'unverified', emailVerified: false });
    aNewUser({ uid: 'disabled', disabled: true });
    aNewUser({ uid: 'guest', providerIds: [] });
    aNewUser({ uid: 'opted-out' });
    db.seed('settings/opted-out', { productEmails: false });

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(4);
    expect(db.exists(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/unverified`)).toBe(
      false,
    );
  });

  it('claims nobody it has nothing to show', async () => {
    db.seed('config/newUserWeekFollowUp', { biteIds: ['day-one-pick'] });
    aNewUser({ uid: 'new-1' });

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(summary.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.exists(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/new-1`)).toBe(
      false,
    );
  });

  it('still mails a follower of an active account when the fallback is empty', async () => {
    db.seed('config/newUserWeekFollowUp', { biteIds: [] });
    aNewUser({ uid: 'new-1' });
    follows('new-1', 'leela');
    anAccount('leela', 'Leela');
    aBite('khao-soi', 'leela', 'Khao Soi');

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(summary.sent).toBe(1);
    expect(sendEmail.mock.calls[0][0].html).not.toContain(
      'More dishes worth trying',
    );
  });

  it('sends in the language the user chose, with an unsubscribe header', async () => {
    aNewUser({ uid: 'new-1' });
    db.seed('settings/new-1', { language: 'de' });

    await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    const [email] = sendEmail.mock.calls[0];

    expect(email.subject).toBe('Was es diese Woche Neues auf BiteTribe gibt');
    expect(email.headers?.['List-Unsubscribe']).toMatch(
      /^<https:\/\/bitetribe\.app\/unsubscribe\/.+>$/,
    );
  });

  it('keeps the claim when the send fails, so a retry cannot mail twice', async () => {
    aNewUser({ uid: 'new-1' });
    sendEmail.mockRejectedValueOnce(new Error('gmail down'));

    const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);
    await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

    expect(summary.failed).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(db.read(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/new-1`)).toEqual(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  describe('monitor copy', () => {
    it('mails the fallback mail with the run counts in the subject', async () => {
      db.seed('config/newUserWeekFollowUp', {
        biteIds: ['pick-1'],
        monitorUids: ['curator'],
      });
      anAuthUser({ uid: 'curator', email: 'ops@example.com' });
      aNewUser({ uid: 'new-1' });

      const summary = await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

      expect(summary.monitored).toBe(1);

      const copy = sendEmail.mock.calls[1][0];

      expect(copy.to).toBe('ops@example.com');
      expect(copy.subject).toBe(
        "[Week follow-up monitor] 1 sent, 0 skipped, 0 failed of 1 - What's new on BiteTribe this week",
      );
      // The curator owns the pick; the copy still shows what new users see.
      expect(copy.html).toContain('Pick One');
      expect(db.exists(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/curator`)).toBe(
        false,
      );
    });

    it('alerts instead when the fallback resolves to nothing', async () => {
      db.seed('config/newUserWeekFollowUp', {
        biteIds: ['day-one-pick'],
        monitorUids: ['curator'],
      });
      anAuthUser({ uid: 'curator', email: 'ops@example.com' });

      await sendNewUserWeekFollowUpsForDay(NOW, sendEmail);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0].subject).toBe(
        '[Week follow-up monitor] 0 sent, 0 skipped, 0 failed of 0 - no fallback resolved',
      );
    });
  });
});
