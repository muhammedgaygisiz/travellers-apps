import { buildCollapseKey, toSurfaceKey } from '../notification-collapse';

describe('buildCollapseKey', () => {
  it('should collapse the notifications about one Bite per type', () => {
    expect(buildCollapseKey({ type: 'NEW_BITE_LIKE', biteId: 'bite1' })).toBe(
      'NEW_BITE_LIKE:bite1',
    );
    expect(buildCollapseKey({ type: 'NEW_BITE_REVIEW', biteId: 'bite1' })).toBe(
      'NEW_BITE_REVIEW:bite1',
    );
    expect(buildCollapseKey({ type: 'NEW_BITE', biteId: 'bite1' })).toBe(
      'NEW_BITE:bite1',
    );
  });

  it('should keep a like and a review on one Bite apart', () => {
    expect(
      buildCollapseKey({ type: 'NEW_BITE_LIKE', biteId: 'bite1' }),
    ).not.toBe(buildCollapseKey({ type: 'NEW_BITE_REVIEW', biteId: 'bite1' }));
  });

  it('should keep the same event on two Bites apart', () => {
    expect(
      buildCollapseKey({ type: 'NEW_BITE_LIKE', biteId: 'bite1' }),
    ).not.toBe(buildCollapseKey({ type: 'NEW_BITE_LIKE', biteId: 'bite2' }));
  });

  it('should collapse replies per thread rather than per Bite', () => {
    expect(
      buildCollapseKey({
        type: 'NEW_REVIEW_REPLY',
        biteId: 'bite1',
        threadId: 'thread1',
      }),
    ).toBe('NEW_REVIEW_REPLY:bite1:thread1');

    expect(
      buildCollapseKey({
        type: 'NEW_REVIEW_REPLY',
        biteId: 'bite1',
        threadId: 'thread2',
      }),
    ).toBe('NEW_REVIEW_REPLY:bite1:thread2');
  });

  it('should collapse a new follower on the follower', () => {
    expect(
      buildCollapseKey({ type: 'NEW_FOLLOWER', followerUid: 'follower1' }),
    ).toBe('NEW_FOLLOWER:follower1');
  });

  it('should keep two countries earned by the same person apart', () => {
    expect(
      buildCollapseKey({
        type: 'NEW_COUNTRY_BADGE',
        userId: 'user1',
        countryCode: 'CH',
      }),
    ).toBe('NEW_COUNTRY_BADGE:user1:CH');

    expect(
      buildCollapseKey({
        type: 'NEW_COUNTRY_BADGE',
        userId: 'user1',
        countryCode: 'IT',
      }),
    ).toBe('NEW_COUNTRY_BADGE:user1:IT');
  });

  it('should collapse a scheduled notification about a fixed page onto itself', () => {
    // The daily leaderboard notification is the single largest source of the
    // backlog: without a key it stacks one entry per day, forever.
    expect(
      buildCollapseKey({ type: 'LEADERBOARD_RANK_CHANGE', userId: 'user1' }),
    ).toBe('LEADERBOARD_RANK_CHANGE');

    expect(buildCollapseKey({ type: 'WEEKLY_BITE_SUMMARY' })).toBe(
      'WEEKLY_BITE_SUMMARY',
    );
    expect(buildCollapseKey({ type: 'NEW_VERSION_AVAILABLE' })).toBe(
      'NEW_VERSION_AVAILABLE',
    );
  });

  it('should not collapse a payload missing the id its key needs', () => {
    // Collapsing on the type alone would merge likes on unrelated Bites into
    // one notification, which loses the other Bites entirely.
    expect(buildCollapseKey({ type: 'NEW_BITE_LIKE' })).toBeUndefined();
    expect(
      buildCollapseKey({ type: 'NEW_REVIEW_REPLY', biteId: 'bite1' }),
    ).toBeUndefined();
    expect(buildCollapseKey({ type: 'NEW_FOLLOWER' })).toBeUndefined();
  });

  it('should not collapse an unknown or absent type', () => {
    expect(buildCollapseKey({ type: 'SOMETHING_ELSE' })).toBeUndefined();
    expect(buildCollapseKey({})).toBeUndefined();
  });
});

describe('toSurfaceKey', () => {
  it('should read the surface out of the second segment', () => {
    expect(toSurfaceKey('NEW_BITE_LIKE:bite1')).toBe('bite1');
    expect(toSurfaceKey('NEW_REVIEW_REPLY:bite1:thread1')).toBe('bite1');
    expect(toSurfaceKey('NEW_COUNTRY_BADGE:user1:CH')).toBe('user1');
  });

  it('should group every notification about one Bite under the same surface', () => {
    expect(toSurfaceKey('NEW_BITE_LIKE:bite1')).toBe(
      toSurfaceKey('NEW_BITE_REVIEW:bite1'),
    );
  });

  it('should treat a fixed page as its own surface', () => {
    expect(toSurfaceKey('LEADERBOARD_RANK_CHANGE')).toBe(
      'LEADERBOARD_RANK_CHANGE',
    );
  });
});
