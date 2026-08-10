import { toNotificationTarget } from './notification-target';

jest.mock('utils', () => ({
  PATH: {
    BITE: 'bite',
    PROFILE: 'profile',
    MY_PROFILE: 'my-profile',
    LEADERBOARD: 'leaderboard',
    WEEKLY_BITES: 'weekly-bites',
  },
}));

const RECIPIENT = 'user-1';

describe(toNotificationTarget.name, () => {
  it.each(['NEW_BITE', 'NEW_BITE_REVIEW', 'NEW_BITE_LIKE'])(
    'targets the bite of a %s notification',
    (type) => {
      expect(
        toNotificationTarget({ type, biteId: 'bite-1' }, RECIPIENT),
      ).toEqual({ commands: ['bite', 'bite-1'] });
    },
  );

  it('targets the thread a review reply belongs to', () => {
    // A Bite's review compartment holds many conversations, so the thread comes
    // along and the page opens on the right one (issue #1283).
    expect(
      toNotificationTarget(
        {
          type: 'NEW_REVIEW_REPLY',
          biteId: 'bite-1',
          threadId: 'root-1',
          replyId: 'reply-1',
          replyAuthorId: 'user-2',
        },
        RECIPIENT,
      ),
    ).toEqual({
      commands: ['bite', 'bite-1'],
      extras: { queryParams: { threadId: 'root-1' } },
    });
  });

  it('still opens the Bite when a reply payload names no thread', () => {
    expect(
      toNotificationTarget(
        { type: 'NEW_REVIEW_REPLY', biteId: 'bite-1' },
        RECIPIENT,
      ),
    ).toEqual({ commands: ['bite', 'bite-1'], extras: undefined });
  });

  it('targets nothing for a reply payload without a bite', () => {
    expect(
      toNotificationTarget(
        { type: 'NEW_REVIEW_REPLY', threadId: 'root-1' },
        RECIPIENT,
      ),
    ).toBeUndefined();
  });

  it('targets the follower profile of a new-follower notification', () => {
    // The subject of the notification is the follower, not the recipient whose
    // uid the same payload also carries (issue #1244).
    expect(
      toNotificationTarget(
        { type: 'NEW_FOLLOWER', userId: RECIPIENT, followerUid: 'user-2' },
        RECIPIENT,
      ),
    ).toEqual({ commands: ['profile', 'user-2'] });
  });

  it('targets the leaderboard for a rank change', () => {
    expect(
      toNotificationTarget({ type: 'LEADERBOARD_RANK_CHANGE' }, RECIPIENT),
    ).toEqual({ commands: ['leaderboard'] });
  });

  it('targets the achiever profile for a follower of a country badge', () => {
    expect(
      toNotificationTarget(
        { type: 'NEW_COUNTRY_BADGE', userId: 'user-2', countryCode: 'IT' },
        RECIPIENT,
      ),
    ).toEqual({ commands: ['profile', 'user-2'] });
  });

  it('targets their own profile for the user who earned the badge', () => {
    // Owner and followers receive the same payload; only the recipient tells
    // the two apart.
    expect(
      toNotificationTarget(
        { type: 'NEW_COUNTRY_BADGE', userId: RECIPIENT, countryCode: 'IT' },
        RECIPIENT,
      ),
    ).toEqual({ commands: ['my-profile'] });
  });

  it('carries the summarized week into the weekly bites page', () => {
    expect(
      toNotificationTarget(
        {
          type: 'WEEKLY_BITE_SUMMARY',
          biteCount: '12',
          weekStart: '1752444000000',
          weekEnd: '1753048799999',
        },
        RECIPIENT,
      ),
    ).toEqual({
      commands: ['weekly-bites'],
      extras: {
        queryParams: {
          weekStart: '1752444000000',
          weekEnd: '1753048799999',
        },
      },
    });
  });

  it('targets the weekly bites page without a range when the payload has none', () => {
    // Notifications sent before the range shipped still have to land on the
    // page; it falls back to the previous week on its own.
    expect(
      toNotificationTarget(
        { type: 'WEEKLY_BITE_SUMMARY', biteCount: '12' },
        RECIPIENT,
      ),
    ).toEqual({ commands: ['weekly-bites'], extras: undefined });
  });

  it.each([
    ['a bite notification without a bite id', { type: 'NEW_BITE' }],
    [
      'a new-follower notification without a follower',
      { type: 'NEW_FOLLOWER' },
    ],
    ['a country badge without an achiever', { type: 'NEW_COUNTRY_BADGE' }],
  ])('has no target for %s', (_, data) => {
    // A malformed payload must not navigate to a half-built route.
    expect(toNotificationTarget(data, RECIPIENT)).toBeUndefined();
  });

  it('has no target for a type this app does not route', () => {
    expect(
      toNotificationTarget({ type: 'SOMETHING_ELSE' }, RECIPIENT),
    ).toBeUndefined();
  });

  it('has no target for a payload without a type', () => {
    expect(
      toNotificationTarget({ biteId: 'bite-1' }, RECIPIENT),
    ).toBeUndefined();
  });

  it('has no target when there is no payload at all', () => {
    expect(toNotificationTarget(undefined, RECIPIENT)).toBeUndefined();
  });
});
