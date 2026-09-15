# epic-850 - epic: Onboarding assistant for new users

Closing record for [#850].
Written before the [Closing Report](../overview/github-issue-format.md#closing-report) rule; kept as-is, not extended.

## Status

- Landed. Issue [#850] was closed as completed on 17 July 2026 with all nine sub-issues done. The assistant, coach marks, and onboarding funnel analytics are in the codebase.

## Description

- \# Epic: Onboarding assistant for new users
- Guide every user through a blocking onboarding assistant after registration so display name, profile visibility, currency, language, location, and notification preferences are complete before they use BiteTribe, then teach the essential features through must-dismiss coach marks.
- \#\# Goal
- Every active user has a complete, trustworthy profile and knows how to create and discover Bites before the public launch.
- \#\# Context
- SSOT: [UC - Guide New Users After Registration](../use-cases/uc-guide-new-users-after-registration.md), [User](../domain/user.md) domain.
- Supersedes closed [#841].
- Landed before the public launch (Phase 2 of the launch roadmap) so the first real users onboard through it.
- \#\# Product Decisions
- The assistant is blocking: after login or registration, any user without the onboarding completion flag is routed into it and cannot reach the rest of the app until it is finished.
- It applies to existing users too, prefilled from their current profile so completing it is fast.
- Completion is marked on the user profile; marked users never see the assistant again.
- Display names become unique, enforced case-insensitively (normalized by trim + lowercase).
- Profile visibility defaults to private, but the step promotes the benefits of going public and the user decides.
- The assistant owns every OS permission ask (location, notifications), in context and never cold from the login path; both denials are accepted and recorded.
- Feature education happens through interactive coach marks after the assistant.

## Outcome

- Onboarding library shipped under `libs/bite-tribe/onboarding/*` with the ordered steps identity, visibility, currency, language, location, notifications, finish (`libs/bite-tribe/onboarding/page/src/lib/steps/onboarding-steps.ts`).
- Coach marks shipped under `libs/common/ui/coach-mark/*` and `libs/bite-tribe/coach-mark/*`.
- Onboarding funnel analytics shipped in `libs/common/ta-firestore/src/lib/analytics/analytics-events.ts` (`onboarding_assistant_started`, `onboarding_step_completed`, `onboarding_assistant_completed`).
- Case-insensitive display-name uniqueness backend shipped under `apps/bite-tribe-firebase/functions/src/functions/users/` (claim/check display name, backfill claims).
- Playwright registration coverage walks the assistant (`apps/bite-tribe-e2e/src/pages/onboarding.page.ts`).

## Superseded notification decision

- Issue [#1184]
  - eserves onboarding as the primary contextual notification ask but also
  - rmits the explicit **Receive notifications on this device** action in
  - ttings.
- The original account-level notification preference is retired. A grant
  - gisters the installation and its token; denial is accepted without
  - iting `Settings.pushNotifications`.
- The original outcome above remains the historical record of what epic [#850]
  - ipped.

## Child issues (all closed)

- [#1011] - Onboarding completion state and blocking entry gate
- [#1012] - Case-insensitive unique display name enforcement
- [#1013] - Assistant shell and step navigation
- [#1014] - Identity and visibility steps
- [#1015] - Currency, language, and notification steps
- [#1023] - Location step
- [#1016] - Completion and feature coach marks
- [#1017] - Onboarding funnel analytics

## Related Domains

- [User](../domain/user.md)
- [Bite](../domain/bite.md)

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
