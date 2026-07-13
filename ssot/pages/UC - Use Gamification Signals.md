# UC - Use Gamification Signals

## Status

Supported today and still expanding.

## Goal

Users can receive lightweight motivation and recognition for food contributions.

## Actors

- Bite creator
- Food lover

## Current Flow

- User opens the leaderboard.
- Backend functions maintain Bite counts.
- Leaderboard displays users by contribution signals.
- Leaderboard rank and profile contribution display are persisted.
- Profile badges show lightweight contribution recognition.
- Ranking-change notifications can nudge users when their position changes.

## Supported Evidence

- `leaderboard`
- `loadLeaderboard`
- `incrementBiteCountOnBiteCreate`
- `resyncBiteCounts`
- `sendDailyLeaderboardNotification`
- Profile country badges

## Related GitHub Scope

- Issue \#770 expands this into badges, contests, and completion rewards.
- Issues 966, 968, 971, and 975 cover the current leaderboard, notification, and profile-badge slices.

## Related Domains

- [[User]]
- [[Bite]]
- [[Bite Trail]]
