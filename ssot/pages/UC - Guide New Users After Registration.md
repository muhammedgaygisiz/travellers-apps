# UC - Guide New Users After Registration

## Status

Next to implement, specified through [[epic-850]].

## Goal

New users should understand BiteTribe and configure the basics needed for useful discovery and contribution.

## Actors

- New user
- Existing user without a completed onboarding
- Privacy-conscious participant

## Target Flow

- User registers or logs in without the onboarding completion flag.
- A blocking assistant guides the user through:
  - a unique display name (case-insensitive) with an optional profile photo
  - the public/private profile decision (private preselected, benefits of public explained)
  - default currency (mandatory) and favorite currencies (optional)
  - app language
  - location priming before the OS permission prompt
  - push notification priming before the OS permission prompt
- Every OS permission is asked here and nowhere else. The prompt appears once per install, so a cold ask from the login path would spend it before the user knows why it matters. Denial is accepted for both.
- Completion is marked on the user profile; the assistant never shows again.
- After the assistant, must-dismiss coach marks teach the essential features on first visit: home feed, create-Bite button, map, bucket lists, leaderboard.

## Related GitHub Scope

- Issue \#850 (epic, supersedes closed \#841)
- Issues \#1011, \#1012, \#1013, \#1014, \#1015, \#1023, \#1016, \#1017

## Related Domains

- [[User]]
- [[Bite]]
