# UC - Guide New Users After Registration

- ## Status

  Supported today. Delivered through [[epic-850]] (issue \#850 closed 17 July 2026; all nine sub-issues complete).

- ## Goal

  New users should understand BiteTribe and configure the basics needed for useful discovery and contribution.

- ## Actors
- New user
- Existing user without a completed onboarding
- Privacy-conscious participant
- ## Target Flow
- User registers or logs in without the onboarding completion flag.
- Registration acknowledges the submit immediately and stays blocked until the assistant is on screen or a localized error is shown, because sign-up, the verification mail, and the onboarding gate are three round-trips that would otherwise look like a dropped tap (issue \#1185).
- A blocking assistant guides the user through:
  - a unique display name (case-insensitive) with an optional profile photo
  - the public/private profile decision (private preselected, benefits of public explained)
  - default currency (mandatory) and favorite currencies (optional)
  - app language
  - location priming before the OS permission prompt
  - push notification priming before the OS permission prompt
- Every OS permission is asked here and nowhere else. The prompt appears once per install, so a cold ask from the login path would spend it before the user knows why it matters. Denial is accepted for both.
- Completion is marked on the user profile; the assistant never shows again.
- After the assistant, must-dismiss coach marks teach the essential features on first visit: home feed, home menu, home feed controls, create-Bite button, Bite details, map, bucket lists, bucket list swipe, leaderboard.
- The home menu mark introduces the header menu as the route to the profile, bucket lists, leaderboard, gallery, marketplace, and settings.
- The home feed controls mark explains Search and Bitemap, and distinguishes Distance (closest Bites) from Date (newest Bites from anywhere).
- The Bite details introduction explains creator attribution for public profiles, distance from the user's current position, and preferred-currency pricing after the Bite has loaded.
- The next Bite details mark highlights sharing through the device share sheet, including WhatsApp when available.
- The Bite details navigation mark then highlights opening directions to the Bite's place in the platform navigation experience.
- The Bite details bucket-list mark finishes the sequence by highlighting how to save a Bite to an existing or new bucket list.
- The bucket list swipe mark (issue \#812) teaches the swipe-to-tick gesture inside a bucket list. It is anchored to the first Bite of the list and stays back while the list is empty, because there is nothing to swipe yet.
- ## Related GitHub Scope
- Issue \#850 (epic, supersedes closed \#841)
- Issues \#1011, \#1012, \#1013, \#1014, \#1015, \#1023, \#1016, \#1017
- ## Related Domains
- [[User]]
- [[Bite]]
