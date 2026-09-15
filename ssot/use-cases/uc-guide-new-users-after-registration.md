# UC - Guide New Users After Registration

## Status

**Level:** L0.
Supported today. Delivered through [epic-850](../github/epic-850.md) (issue [#850] closed 17 July 2026; all nine
sub-issues complete). The blocking assistant, its seven steps, the funnel analytics and the
coach-mark sequence all ship. Onboarding is the app's first-run permission surface, which is
what makes `App Store Review Area` below the substantial section on this page.

## Goal

Someone who has just registered reaches a usable app: named, with a visibility choice made, a
currency and language set, and the two permissions the product depends on either granted or
knowingly declined. This page owns what the assistant asks, in what order, and what it does
with an answer - including a declined one.

## Actors

- **Bite Creator** - completes the assistant once, on first entry. Every account passes through
  it: an existing account without the completion flag is routed back into it rather than
  exempted.

## Flow

- User registers or logs in without the onboarding completion flag.
- Registration acknowledges the submit immediately and stays blocked until the assistant is on screen or a localized error is shown, because sign-up, the verification mail, and the onboarding gate are three round-trips that would otherwise look like a dropped tap (issue [#1185]).
- A blocking assistant guides the user through:
  - a unique display name (case-insensitive) with an optional profile photo
  - the public/private profile decision (private preselected, benefits of public explained)
  - default currency (mandatory) and favorite currencies (optional)
  - app language
  - location priming before the OS permission prompt, followed by the optional home city shown on the profile
  - push notification priming before the OS permission prompt
- Onboarding is the primary first-run permission surface. Permission prompts
  may also follow an explicit later setup or recovery action, such as **Receive
  notifications on this device** in Settings; they never appear cold from
  login, startup, or passive loading.
- A notification grant registers the current installation and token. Denial is
  accepted without saving an account-level notification preference;
  `Settings.pushNotifications` is retired by issue [#1184].
- Every permission step reads the live OS state when the assistant starts and
  skips its question where the permission is already granted. The assistant does
  not ask what the platform has already answered, and no stored account flag may
  gate that: the grant is a fact about this installation, while
  `settings.location` is what a user once chose on some install (issue [#1412],
  the assistant's half of [#1386]). A denial still leaves the choice on screen,
  because the step is where a user who changed their mind gets back to it.
- The home city is the `PublicUser.city` the profile header displays next to the
  display name. It shares the location step because it is the same question in
  the user's mind, while the copy keeps it apart from the device position: one
  is a place the user identifies with, the other is where the phone happens to
  be. It is entered by hand at city granularity, without reverse-geocoding the
  device position, so the region misreading in issue [#1262] is not repeated
  (issue [#1271]).
- The home city is optional and never gates the step. Leaving it empty is a
  decline, and the profile renders no location line at all rather than a
  missing-data placeholder (issue [#1270]). The step states who can see the field,
  based on the public or private choice made two steps earlier, because it is
  displayed publicly and carries a privacy weight that currency and language do
  not.
- Completion is marked on the user profile; the assistant never shows again.
- After the assistant, must-dismiss coach marks teach the essential features on first visit: home feed, home menu, home feed controls, create-Bite button, Bite details, map, bucket lists, bucket list swipe, leaderboard.
- The home menu mark introduces the header menu as the route to the profile, bucket lists, leaderboard, gallery, marketplace, and settings.
- The home feed controls mark explains Search and Bitemap, and distinguishes Distance (closest Bites) from Date (newest Bites from anywhere).
- The Bite details introduction explains creator attribution for public profiles, distance from the user's current position, and preferred-currency pricing after the Bite has loaded.
- The next Bite details mark highlights sharing through the device share sheet, including WhatsApp when available.
- The Bite details navigation mark then highlights opening directions to the Bite's place in the platform navigation experience.
- The Bite details bucket-list mark finishes the sequence by highlighting how to save a Bite to an existing or new bucket list.
- The bucket list swipe mark (issue [#812]) teaches the swipe-to-tick gesture inside a bucket list. It is anchored to the first Bite of the list and stays back while the list is empty, because there is nothing to swipe yet.
- The assistant reports its own funnel. `onboarding_assistant_started` is logged when it
  opens, `onboarding_step_completed` as each step is finished, and
  `onboarding_assistant_completed` at the end (issue [#1017]). These are app-interaction
  events, declared with the rest in [Implementation - Store Declarations](../implementation/store-declarations.md).

## MVP Classification

**[MVP]** - the blocking assistant and its steps: the unique display name, the public/private
choice, currency, language, and the priming in front of each OS permission prompt. No account
reaches the app without completing it, so it is on the path of every first session.

**[Secondary]** - the coach-mark sequence and the funnel analytics. Both ship; neither is
required for a first release, and the coach marks are ten must-dismiss interruptions that the
product could tune afterwards.

## App Store Review Area

Relevant, and more of it is exercised here than anywhere else: this is the app's first-run
permission surface, so the purpose strings are read here before any other screen shows them.

- The steps are backed by `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSPhotoLibraryAddUsageDescription` and `NSLocationWhenInUseUsageDescription`.
  `NSLocationAlwaysAndWhenInUseUsageDescription` is declared as well and nothing requests
  always-on location; removing it is [#1607].
- Android reaches the gallery through the system Photo Picker ([#1394]), which needs no storage
  permission, and `POST_NOTIFICATIONS` arrives by manifest merge from
  `@capacitor-firebase/messaging` rather than being declared in the app's own manifest.
- The priming rule is the review-facing one: a prompt follows an explicit step or a later
  recovery action and never appears cold from login, startup or passive loading. A reviewer
  sees each prompt in the context that explains it.
- The data these steps collect is declared in [Implementation - Store Declarations](../implementation/store-declarations.md).

## Supported Evidence

- `libs/bite-tribe/onboarding/{page,guards,data-access}`.
- The step components: `identity-step`, `photos-step`, `visibility-step`, `currency-step`,
  `language-step`, `location-step`, `notification-step`, `finish-step`.
- `onboardingCompletedAt` and `onboardingCompletedAtTimestamp` on the user profile, written by
  `completeOnboarding`.
- `AnalyticsEvent.OnboardingAssistantStarted`, `OnboardingStepCompleted` and
  `OnboardingAssistantCompleted`, logged from `OnboardingService`.

## Related GitHub Scope

- Issue [#850] (epic, supersedes closed [#841])
- Issues [#1011], [#1012], [#1013], [#1014], [#1015], [#1023], [#1016], [#1017]
- Issue [#1271] (home city collected in the location step), with [#1270] for the
  profile display of the same field
- Issue [#1412] (the location step reads the live OS grant), following [#1394] for
  the photos step and [#1184] for notifications

## Related Domains

- [User](../domain/user.md)
- [Bite](../domain/bite.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the new user, the existing user
  without a completed onboarding, and the privacy-conscious participant
- [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md) - the display name, photo and visibility this step
  collects, and where the home city is rendered
- [UC - Configure Personal Settings](uc-configure-personal-settings.md) - where currency, language and notification delivery are
  changed afterwards
- [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) - the installation the notification
  grant registers
- [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) - where the camera and photo permissions are then
  used
- [Implementation - Store Declarations](../implementation/store-declarations.md)
- [epic-850](../github/epic-850.md)

[#812]: https://github.com/muhammedgaygisiz/travellers-apps/issues/812
[#841]: https://github.com/muhammedgaygisiz/travellers-apps/issues/841
[#850]: https://github.com/muhammedgaygisiz/travellers-apps/issues/850
[#1011]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1011
[#1012]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1012
[#1013]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1013
[#1014]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1014
[#1015]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1015
[#1016]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1016
[#1017]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1017
[#1023]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1023
[#1184]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1184
[#1185]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1185
[#1262]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1262
[#1270]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1270
[#1271]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1271
[#1386]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1386
[#1394]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1394
[#1412]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1412
[#1607]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1607
