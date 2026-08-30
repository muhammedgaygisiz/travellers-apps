import {
  isNotificationForSurface,
  toNotificationSurface,
} from './notification-surface';

jest.mock('utils', () => ({
  PATH: {
    BITE: 'bite',
    PROFILE: 'profile',
    MY_PROFILE: 'my-profile',
    LEADERBOARD: 'leaderboard',
    WEEKLY_BITES: 'weekly-bites',
  },
}));

describe('isNotificationForSurface', () => {
  it('matches every notification about one Bite', () => {
    expect(isNotificationForSurface('NEW_BITE_LIKE:bite1', 'bite1')).toBe(true);
    expect(isNotificationForSurface('NEW_BITE_REVIEW:bite1', 'bite1')).toBe(
      true,
    );
    expect(
      isNotificationForSurface('NEW_REVIEW_REPLY:bite1:thread1', 'bite1'),
    ).toBe(true);
  });

  it('matches a badge on the profile that earned it, whichever country', () => {
    expect(
      isNotificationForSurface('NEW_COUNTRY_BADGE:user1:CH', 'user1'),
    ).toBe(true);
    expect(
      isNotificationForSurface('NEW_COUNTRY_BADGE:user1:IT', 'user1'),
    ).toBe(true);
  });

  it('matches a fixed page on its own type', () => {
    expect(
      isNotificationForSurface(
        'LEADERBOARD_RANK_CHANGE',
        'LEADERBOARD_RANK_CHANGE',
      ),
    ).toBe(true);
  });

  it('does not match another Bite', () => {
    expect(isNotificationForSurface('NEW_BITE_LIKE:bite2', 'bite1')).toBe(
      false,
    );
  });

  it('does not match a notification with no key', () => {
    // Android hands back no tag for a notification sent before this contract.
    // Clearing it would dismiss something the user has not seen.
    expect(isNotificationForSurface(undefined, 'bite1')).toBe(false);
    expect(isNotificationForSurface('', 'bite1')).toBe(false);
  });
});

describe('toNotificationSurface', () => {
  it('reads the Bite a Bite page is showing', () => {
    expect(toNotificationSurface('/bite/bite1', 'me')).toBe('bite1');
  });

  it('reads the Bite from a page nested under it', () => {
    // The user reading a Bite's restaurant has plainly seen the Bite.
    expect(
      toNotificationSurface('/bite/bite1/restaurant/restaurant1', 'me'),
    ).toBe('bite1');
  });

  it('reads the profile a profile page is showing', () => {
    expect(toNotificationSurface('/profile/user1', 'me')).toBe('user1');
  });

  it('resolves the own-profile route to the signed-in account', () => {
    // `NEW_COUNTRY_BADGE` reaches the achiever with their own uid as its
    // surface, and their route does not carry it.
    expect(toNotificationSurface('/my-profile', 'me')).toBe('me');
  });

  it('has no surface for the own-profile route without a signed-in account', () => {
    expect(toNotificationSurface('/my-profile', undefined)).toBeUndefined();
  });

  it('reads the fixed pages as their own surfaces', () => {
    expect(toNotificationSurface('/leaderboard', 'me')).toBe(
      'LEADERBOARD_RANK_CHANGE',
    );
    expect(
      toNotificationSurface('/weekly-bites?weekStart=1&weekEnd=2', 'me'),
    ).toBe('WEEKLY_BITE_SUMMARY');
  });

  it('has no surface for a route no notification talks about', () => {
    expect(toNotificationSurface('/home', 'me')).toBeUndefined();
    expect(toNotificationSurface('/bites', 'me')).toBeUndefined();
    expect(toNotificationSurface('/', 'me')).toBeUndefined();
  });

  it('has no surface for a Bite route missing its id', () => {
    expect(toNotificationSurface('/bite', 'me')).toBeUndefined();
  });
});
