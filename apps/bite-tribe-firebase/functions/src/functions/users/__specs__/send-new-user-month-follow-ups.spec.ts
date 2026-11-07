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
  NEW_USER_MONTH_FOLLOW_UPS_COLLECTION,
  NEW_USER_WEEK_FOLLOW_UPS_COLLECTION,
} from '../new-user-week-follow-up-picks';
import { sendNewUserMonthFollowUpsForDay } from '../send-new-user-month-follow-ups';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Tuesday 10 November 2026, 18:00 in Zurich (CET). */
const NOW = new Date('2026-11-10T17:00:00.000Z');
/** 10:00 Zurich (CEST) on 11 October: day 30 is today. */
const SIGNED_UP = Date.parse('2026-10-11T08:00:00.000Z');
/** Midnight Zurich starting 3 November, the first moment of day 23. */
const DAY_TWENTY_THREE = Date.parse('2026-11-02T23:00:00.000Z');

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
  { createdAtTimestamp = NOW.getTime() - 2 * DAY } = {},
): void =>
  db.seed(`bites/${id}`, {
    userId,
    name,
    place: 'China Wok',
    imagePath: `https://example.com/${id}.jpg`,
    imageStatus: 'uploaded',
    createdAtTimestamp,
  });

const anAccount = (uid: string, displayName: string): void =>
  db.seed(`users/${uid}`, {
    displayName,
    public: true,
    createdAtTimestamp: NOW.getTime() - 400 * DAY,
  });

const follows = (uid: string, followedUid: string): void =>
  db.seed(`users/${uid}/following/${followedUid}`, {});

/**
 * The fallback, with the picks the day-1 and the day-7 configs name in front,
 * so the order alone would put them into every mail.
 */
const seedFallback = (): void => {
  db.seed('config/newUserFollowUp', { biteIds: ['day-one-pick'] });
  db.seed('config/newUserWeekFollowUp', { biteIds: ['day-seven-pick'] });
  db.seed('config/newUserMonthFollowUp', {
    biteIds: ['day-one-pick', 'day-seven-pick', 'pick-1', 'pick-2', 'pick-3'],
  });
  anAccount('curator', 'Curator');
  aBite('day-one-pick', 'curator', 'Day One Dish');
  aBite('day-seven-pick', 'curator', 'Day Seven Dish');
  aBite('pick-1', 'curator', 'Pick One');
  aBite('pick-2', 'curator', 'Pick Two');
  aBite('pick-3', 'curator', 'Pick Three');
};

describe('sendNewUserMonthFollowUpsForDay', () => {
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

  it('shows a month of Bites from followed accounts first and fills the rest from the fallback', async () => {
    aNewUser({ uid: 'new-1' });
    follows('new-1', 'leela');
    anAccount('leela', 'Leela');
    aBite('khao-soi', 'leela', 'Khao Soi', {
      createdAtTimestamp: NOW.getTime() - 20 * DAY,
    });
    aBite('stale', 'leela', 'Stale Dish', {
      createdAtTimestamp: NOW.getTime() - 31 * DAY,
    });

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(summary).toEqual({
      candidates: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
      monitored: 0,
    });

    const [email] = sendEmail.mock.calls[0];

    expect(email.to).toBe('new-1@example.com');
    expect(email.subject).toBe('What you missed on BiteTribe this month');
    expect(email.html).toContain('From people you follow this month');
    expect(email.html).toContain('Khao Soi');
    expect(email.html.indexOf('Khao Soi')).toBeLessThan(
      email.html.indexOf('Pick One'),
    );
    expect(email.html).toContain('Pick Two');
    expect(email.html).not.toContain('Pick Three');
    expect(email.html).not.toContain('Stale Dish');
    expect(email.html).toContain(
      'https://bitetribe.app/bite/khao-soi?utm_source=bitetribe&amp;utm_medium=email&amp;utm_campaign=new_user_month_follow_up',
    );
    expect(email.html).not.toContain('new_user_week_follow_up');
    expect(db.read(`${NEW_USER_MONTH_FOLLOW_UPS_COLLECTION}/new-1`)).toEqual(
      expect.objectContaining({ status: 'sent', sentAt: NOW.toISOString() }),
    );
    expect(db.exists(`${NEW_USER_WEEK_FOLLOW_UPS_COLLECTION}/new-1`)).toBe(
      false,
    );
  });

  it('never repeats a fallback pick the day-1 or the day-7 config names', async () => {
    aNewUser({ uid: 'new-1' });

    await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    const { html } = sendEmail.mock.calls[0][0];

    expect(html).toContain('More dishes worth trying');
    expect(html).toContain('Pick One');
    expect(html).toContain('Pick Two');
    expect(html).toContain('Pick Three');
    expect(html).not.toContain('Day One Dish');
    expect(html).not.toContain('Day Seven Dish');
  });

  it('leaves alone a user the app saw in the last seven days, without claiming them', async () => {
    aNewUser({ uid: 'active' }, { lastSeenTimestamp: DAY_TWENTY_THREE + HOUR });
    aNewUser({
      uid: 'session',
      lastRefreshTime: new Date(DAY_TWENTY_THREE + 3 * DAY).toUTCString(),
    });

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(2);
    expect(db.exists(`${NEW_USER_MONTH_FOLLOW_UPS_COLLECTION}/active`)).toBe(
      false,
    );
  });

  it('still mails a user who came back after the day-7 mail and drifted off again', async () => {
    const dayTwelve = SIGNED_UP + 11 * DAY;

    aNewUser(
      { uid: 'drifted', lastRefreshTime: new Date(dayTwelve).toUTCString() },
      { lastSeenTimestamp: dayTwelve },
    );

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(summary.sent).toBe(1);
  });

  it('reads the Zurich calendar day thirty days back, across the change from summer time', async () => {
    // 23:30 Zurich (CEST) on 11 October: still day 30.
    aNewUser(
      { uid: 'late' },
      { createdAtTimestamp: Date.parse('2026-10-11T21:30:00.000Z') },
    );
    // 00:30 Zurich (CEST) on 12 October: day 29.
    aNewUser(
      { uid: 'day-29' },
      { createdAtTimestamp: Date.parse('2026-10-11T22:30:00.000Z') },
    );
    // 23:30 Zurich (CEST) on 10 October: day 31.
    aNewUser(
      { uid: 'day-31' },
      { createdAtTimestamp: Date.parse('2026-10-10T21:30:00.000Z') },
    );

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(summary.candidates).toBe(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('late@example.com');
  });

  it('never mails the same account twice, even when a late run repeats the day', async () => {
    aNewUser({ uid: 'new-1' });

    await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);
    const second = await sendNewUserMonthFollowUpsForDay(
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

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(4);
  });

  it('claims nobody it has nothing to show', async () => {
    db.seed('config/newUserMonthFollowUp', {
      biteIds: ['day-one-pick', 'day-seven-pick'],
    });
    aNewUser({ uid: 'new-1' });

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(summary.sent).toBe(0);
    expect(db.exists(`${NEW_USER_MONTH_FOLLOW_UPS_COLLECTION}/new-1`)).toBe(
      false,
    );
  });

  it('sends in the language the user chose', async () => {
    aNewUser({ uid: 'new-1' });
    db.seed('settings/new-1', { language: 'de' });

    await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(sendEmail.mock.calls[0][0].subject).toBe(
      'Was du diesen Monat auf BiteTribe verpasst hast',
    );
  });

  it('records a failed send and keeps the claim', async () => {
    aNewUser({ uid: 'new-1' });
    sendEmail.mockRejectedValueOnce(new Error('gmail down'));

    const summary = await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

    expect(summary.failed).toBe(1);
    expect(db.read(`${NEW_USER_MONTH_FOLLOW_UPS_COLLECTION}/new-1`)).toEqual(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  describe('monitor copy', () => {
    it('mails the fallback mail under its own tag', async () => {
      db.seed('config/newUserMonthFollowUp', {
        biteIds: ['pick-1'],
        monitorUids: ['curator'],
      });
      anAuthUser({ uid: 'curator', email: 'ops@example.com' });

      await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

      expect(sendEmail.mock.calls[0][0].subject).toBe(
        '[Month follow-up monitor] 0 sent, 0 skipped, 0 failed of 0 - What you missed on BiteTribe this month',
      );
    });

    it('alerts with the month config when the fallback resolves to nothing', async () => {
      db.seed('config/newUserMonthFollowUp', {
        biteIds: ['day-seven-pick'],
        monitorUids: ['curator'],
      });
      anAuthUser({ uid: 'curator', email: 'ops@example.com' });

      await sendNewUserMonthFollowUpsForDay(NOW, sendEmail);

      const [alert] = sendEmail.mock.calls[0];

      expect(alert.subject).toBe(
        '[Month follow-up monitor] 0 sent, 0 skipped, 0 failed of 0 - no fallback resolved',
      );
      expect(alert.html).toContain('config/newUserMonthFollowUp');
    });
  });
});
