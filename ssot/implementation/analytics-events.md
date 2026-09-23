# Implementation - Analytics Events

- ## Purpose

  This page is the source of truth for the product analytics taxonomy. It
  documents each event, how it is emitted in code, the launch dashboard to build
  in the GA4/Firebase console, and how to verify events in DebugView.

  The launch-critical core was defined by issue 910 (part of [epic-907][#907],
  Phase 2 / Week 3), and the onboarding funnel by [epic-850](../records/epic-850.md). Issue 1098
  added the first events the **business** app owns - the table operations of
  [epic-1071][#1071] - which is where the per-event surface rule below comes from.

  See [Architecture - Analytics](../architecture/analytics.md) for how this fits the wider analytics surface.

- ## How Events Are Emitted
- Events and their typed parameters live in
  `libs/common/ta-firestore/src/lib/analytics/analytics-events.ts`.
- They are sent through `AnalyticsService`
  (`libs/common/ta-firestore/src/lib/analytics/analytics.service.ts`), a thin
  typed wrapper over `FirebaseAnalytics.logEvent`.
- Tracking is best-effort: it never throws.
- Every event declares the app it belongs to in `ANALYTICS_EVENT_SURFACE`, and
  an event whose surface is not the running bundle is dropped. The bundle is
  read from `NX_APP_BITE_TRIBE_IS_BUSINESS`, which `env-var-plugin.js` compiles
  into the business app. Until issue 1098 the guard was per _app_ rather than
  per event and the whole service no-opped in the business app, because every
  event it knew belonged to the consumer one; the table operations of issue
  1098 are the first events the business app owns. The consumer taxonomy is
  still silent there, and a table event is just as silent in the consumer app.
  The map is a total `Record` over every event name, so the next event added
  does not compile until somebody decides which app emits it.
- The admin app reads as `consumer` and emits nothing. Its bundle carries no
  flag of its own on purpose (`apps/bite-tribe-admin/env-var-plugin.js` says
  why), and nothing in it calls `logEvent`.
- Events are emitted from the **integration layer** (services / route
  containers) that owns the behavior, never from presentational components.
- Event names follow the GA4 `snake_case` convention; parameter values are
  primitives only.
- ## Event Reference

  | Category     | Event                                 | Params                                                                                                     | Trigger                                                                                            | Owner                                                                                                       |
  | ------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
  | Activation   | `sign_up`                             | `method: string` (`'password'`)                                                                            | Registration succeeds                                                                              | `libs/common/ui/auth/.../registration/registration.service.ts`                                              |
  | Activation   | `password_reset_requested`            | –                                                                                                          | Forgot-password form submitted                                                                     | `libs/common/ui/auth/.../forgot-password/forgot-password.service.ts`                                        |
  | Activation   | `password_reset_request_failed`       | `code: string`                                                                                             | Firebase rejects a forgot-password request                                                         | `libs/common/ui/auth/.../forgot-password/forgot-password.service.ts`                                        |
  | Activation   | `email_verification_prompt_shown`     | `surface: 'home' \| 'settings' \| 'profile_edit'`                                                          | Eligible unverified user enters a prompt surface                                                   | Home, settings, and profile integration services                                                            |
  | Activation   | `email_verification_resend_tapped`    | `surface: 'home' \| 'settings' \| 'profile_edit'`                                                          | User taps resend verification email                                                                | Home, settings, and profile integration services                                                            |
  | Activation   | `email_verification_resend_succeeded` | `surface: 'home' \| 'settings' \| 'profile_edit'`                                                          | Backend resend callable succeeds                                                                   | Home, settings, and profile integration services                                                            |
  | Activation   | `email_verification_resend_failed`    | `surface: 'home' \| 'settings' \| 'profile_edit'`, `reason: string`                                        | Backend resend callable fails or rate-limits                                                       | Home, settings, and profile integration services                                                            |
  | Activation   | `email_verification_synced`           | `verified: boolean`, `source: 'app_start' \| 'app_resume' \| 'profile_edit'`                               | App syncs Firebase Auth email verification metadata                                                | `libs/bite-tribe/store/src/lib/app/effects.ts`                                                              |
  | Account      | `account_deletion_started`            | –                                                                                                          | User confirms the destructive delete-account alert                                                 | `libs/bite-tribe/account/data-access/.../delete-my-account.service.ts`                                      |
  | Account      | `account_deletion_completed`          | –                                                                                                          | Backend cascade succeeds and the user is signed out                                                | `libs/bite-tribe/account/data-access/.../delete-my-account.service.ts`                                      |
  | Account      | `account_deletion_failed`             | `reason: 'reauth_required' \| 'reauth_failed' \| 'account_changed' \| 'unknown'`                           | Deletion needs a fresh sign-in, targets an account other than the confirmed one, or fails outright | `libs/bite-tribe/account/data-access/.../delete-my-account.service.ts`                                      |
  | Creation     | `bite_created`                        | `source: 'visit' \| 'menu' \| 'manual'`                                                                    | New Bite persisted                                                                                 | `libs/bite-tribe/bite/page/.../integration/bite.service.ts`                                                 |
  | Creation     | `bucketlist_created`                  | –                                                                                                          | Bucket list created                                                                                | `libs/bite-tribe/bucketlist/page/.../integration/bucketlists.service.ts`                                    |
  | Creation     | `bucketlist_rated`                    | `rating: number`                                                                                           | BiteTrail rating submitted                                                                         | `libs/bite-tribe/bucketlist/page/.../integration/rate-bucketlist.service.ts`                                |
  | Discovery    | `search_performed`                    | –                                                                                                          | Query first reaches the min length (once per search session)                                       | `libs/bite-tribe/search/page/.../integration/search.service.ts`                                             |
  | Discovery    | `restaurant_viewed`                   | `verified: boolean`                                                                                        | Restaurant / place page entered                                                                    | `libs/bite-tribe/restaurant/page/.../integration/*restaurant-container*.ts`                                 |
  | Discovery    | `bite_viewed`                         | –                                                                                                          | Bite details page entered                                                                          | `libs/bite-tribe/details/page/.../integration/details.container.ts`                                         |
  | Onboarding   | `onboarding_assistant_started`        | –                                                                                                          | Assistant loads for the first time in a session                                                    | `libs/bite-tribe/onboarding/page/.../integration/onboarding.service.ts`                                     |
  | Onboarding   | `onboarding_step_completed`           | `step: OnboardingStepId`                                                                                   | A step is persisted and marked complete on advance                                                 | `libs/bite-tribe/onboarding/page/.../integration/onboarding.service.ts`                                     |
  | Onboarding   | `onboarding_assistant_completed`      | –                                                                                                          | Completion flag is written on the finish step                                                      | `libs/bite-tribe/onboarding/page/.../integration/onboarding.service.ts`                                     |
  | Onboarding   | `coach_mark_dismissed`                | `surface: CoachMarkSurface`                                                                                | A coach mark is dismissed for the first time                                                       | `libs/bite-tribe/coach-mark/src/lib/coach-mark-state.service.ts`                                            |
  | Table ops    | `table_seated`                        | `TableOperation`, `from_status: TableStatus`, `guests?: number`                                            | A transition into `occupied` is confirmed                                                          | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table ops    | `table_freed`                         | `TableOperation`, `from_status: TableStatus`                                                               | A transition into `available` is confirmed                                                         | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table ops    | `table_reserved`                      | `TableOperation`, `from_status: TableStatus`                                                               | A transition into `reserved` is confirmed                                                          | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table ops    | `table_cleaning_started`              | `TableOperation`, `from_status: TableStatus`                                                               | A transition into `cleaning` is confirmed                                                          | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table ops    | `table_disabled`                      | `TableOperation`, `from_status: TableStatus`                                                               | A transition into `disabled` is confirmed                                                          | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table ops    | `table_visit_opened`                  | `TableOperation`, `visit_id: string`                                                                       | The transition opened a visit the table did not already carry                                      | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table ops    | `table_visit_closed`                  | `TableOperation`, `visit_id: string`, `outcome: 'closed' \| 'abandoned'`                                   | The transition ended the visit at that table                                                       | `libs/bite-tribe-business/table-management/page/.../table-plan.service.ts`                                  |
  | Table funnel | `table_code_scanned`                  | `TableGuestParams` (ids absent on a refusal), `outcome: 'confirm' \| 'menu_only' \| 'refused' \| 'failed'` | A scanned code resolves, is refused, or cannot be reached                                          | `libs/bite-tribe/table-session/data-access/.../table-session.service.ts`                                    |
  | Table funnel | `table_session_started`               | `TableGuestParams`, `status: 'pending' \| 'active'`                                                        | The backend opened a session for the confirmed table                                               | `libs/bite-tribe/table-session/data-access/.../table-session.service.ts`                                    |
  | Table funnel | `table_order_submitted`               | `TableGuestParams`, `line_count: number`                                                                   | An order reached the kitchen, replays excluded                                                     | `libs/bite-tribe/table-order/data-access/.../table-order.service.ts`                                        |
  | Table funnel | `table_bite_prompt_shown`             | `restaurant_id`, `has_account`, `visit_id: string`, `surface: 'table' \| 'visit_detail'`                   | A visit summary reached a guest with the Bite offer on it                                          | `.../table-order/data-access/.../visit-summary.service.ts`, `.../visits/page/.../visit-detail.container.ts` |
  | Table funnel | `table_bite_started`                  | `restaurant_id`, `has_account`, `visit_id: string`, `surface: 'table' \| 'visit_detail'`                   | The guest opened the Bite form from that offer                                                     | `.../menu/page/.../order/table-order.component.ts`, `.../visits/page/.../visit-detail.container.ts`         |

  The onboarding funnel events belong to the onboarding assistant epic ([epic-850](../records/epic-850.md),
  issue [#1017]), not to the launch taxonomy of issue 910. `onboarding_step_completed`
  fires once per step in order (`identity`, `visibility`, `currency`, `language`,
  `location`, `notifications`, `finish`); `onboarding_assistant_completed` fires
  once, after the `finish` step's completion write succeeds. `coach_mark_dismissed`
  carries the dismissed `CoachMarkSurface` id and fires only on the first dismissal
  per user, so re-entering a surface whose mark was already seen emits nothing.

- ## App Check Telemetry

  The five `app_check_*` events are **not** part of the product taxonomy above.
  They are emitted directly by
  `libs/common/ta-firestore/src/lib/initialize-firebase-app-check.ts`, not
  through `AnalyticsService`, because they have to fire during the app
  initializer - before the injector the service lives in is usable - and
  because they belong to platform readiness rather than to product behavior.
  They are listed here so nobody reads them in GA4 without knowing what they
  can and cannot answer.

  | Event                             | Params                                      | Trigger                                        |
  | --------------------------------- | ------------------------------------------- | ---------------------------------------------- |
  | `app_check_startup_started`       | base                                        | The initializer begins                         |
  | `app_check_startup_completed`     | base, `duration_ms`, `platform`, `provider` | A provider was registered                      |
  | `app_check_initialization_failed` | base, `platform`, `provider`, `reason`      | Provider registration threw                    |
  | `app_check_skipped`               | base, `platform`, `reason`                  | Dev mode, unsupported platform, or no site key |
  | `app_check_token_preflight`       | base, `succeeded`, `trigger`, `reason?`     | A token was actually requested                 |
  | `app_check_enforced_blocked`      | base, `platform`, `provider`, `reason`      | Enforced mode could not prove readiness        |

  The base parameters on every one of them are `runtime_mode`, `device_class`,
  `has_site_key` and `has_debug_token`.

- ### Why the preflight event exists

  **Registering a provider is not evidence that attestation works.** The native
  bridge registers a `CustomProvider`, which never fetches a token, so before
  issue [#1221] a client that could not attest at all still reported
  `app_check_startup_completed` and nothing disagreed. The token round-trip only
  ran when enforcement was already on, which meant the only way to find out
  whether enforcement would work was to switch it on in production.

  `app_check_token_preflight` now fires whenever a provider was registered,
  enforced or not, and carries `succeeded`. It is the readiness signal to read
  before enabling enforcement.

  **Enforced mode awaits it; non-enforced mode does not.** With enforcement off
  the token changes nothing about startup, so awaiting a round-trip inside the
  app initializer would delay initial navigation for every user to buy a metric.
  The request is issued and reported when it settles. `trigger` separates the
  startup attempt from a `retry` through the enforced-mode gate.

- ### Why `device_class` exists

  Firebase's own App Check metrics are per-service and carry **no client
  attribution**, so production numbers are the only readiness signal there is.
  A simulator or emulator cannot attest, so its traffic is unverified by
  construction - and a production build on a simulator was previously
  indistinguishable from a physical device here, since both carry
  `runtime_mode: production` and `platform: ios`. Test traffic polluting the
  metric could therefore not be identified, let alone subtracted.

  `device_class` is `virtual`, `physical`, or `unknown`, read from
  `@capacitor/device`'s `isVirtual`. **A web client is `unknown`, not
  `physical`.** The plugin answers `isVirtual: false` in a browser, which would
  read as a claim about hardware rather than as the absence of one, so only
  native platforms are asked. The lookup is best-effort and falls back to
  `unknown`; attribution is never worth failing startup for.

  Note the remaining blind spot: `runtime_mode: dev_simulator` suppresses
  telemetry entirely, so a dev build reports nothing at all. That is intended -
  a dev build talks to the emulators, which do not enforce App Check.

- ## Table Operations

  The seven `table_*` events belong to the staff table management of
  [epic-1071][#1071] (issue 1098) and are emitted by the **business** app alone. They
  are not launch signals and are deliberately absent from the launch dashboard
  below; the measures they exist for are the BigQuery query named under Derived
  Measures.

  `TableOperation` in the table above is the three parameters every one of them
  carries: `restaurant_id`, `table_id` and `table_count`. All three are on every
  event rather than on the one event that needs each, so no measure depends on
  joining two event names, and `table_count` — the restaurant's tables across
  all its rooms — is the denominator of both rates issue 1098 asks for.

- ### What is measured, and what is not

  **Only confirmed transitions.** The events are emitted from the two places a
  transition is confirmed — the callable answering, and a queued transition
  landing on reconnect — and from neither of the places one is merely asked for.
  A refused transition did not happen; a transition made offline has happened
  by the time it is counted, so going offline changes an event's timing and not
  the total. A `replayed` answer is the backend saying it already applied that
  exact intent (issue 1096), so it is counted once.

  **Five names keyed on the target, `from_status` as a parameter.** Freeing an
  occupied table and putting a blocked one back into service are the same
  transition into `available` and are not the same sentence, so they are one
  event with two readings rather than two event names. The map lives in
  `OPERATION_EVENTS` in `table-plan.service.ts`.

  **`ordering` and `awaitingPayment` carry no event.** They are in the
  transition matrix and the action sheet offers them (issue 1094), but the
  events that reach them are the QR ordering of issue 1072. The transitions
  still happen and are still in the audit trail; they are not measured until
  the stage that owns them says what it wants measured.

  **A seating produces two events, on purpose.** Seating a table _is_ opening a
  visit, so `table_seated` and `table_visit_opened` describe one commit. They
  are kept apart because they measure different objects: a place in the room,
  and a party that will carry orders (issue 1072) and a bill (issue 1073) and
  can outlive the table it started at. **Any count of seatings therefore reads
  one of the two names and never their sum.**

  **A carried visit is not a new one.** `TableState.visitId` is the only pointer
  at an open visit, so the pointer the table held going in is compared against
  the one the callable answers with. A visit carried between the party statuses
  keeps its id and raises nothing. On the offline-replay path the pointer is
  read when the transition lands rather than when it was made, because the
  queue entry records the status the device was showing and not the visit behind
  it; if the listener has already delivered that same transition the event is
  missed, and it can never be invented — a carried visit keeps its id and so
  never looks new.

  **`table_visit_moved` does not exist.** Issue 1098 names it, and
  `moveTableVisit` has existed since issue 1095, but no surface calls it —
  [UC - Manage Tables During Service](../use-cases/uc-manage-tables-during-service.md) records the same gap. An event constant
  nothing emits would be a row in this table that DebugView can never show, so
  the event lands with the move surface rather than ahead of it.

- ## The Order-To-Bite Funnel

  Stage 4 of [epic-1073][#1073] exists to answer one question - does the table
  platform actually feed the core product - and issue [#1114] is that question
  as a number. Seven steps, from a code being scanned to a Bite being published
  about what was eaten.

  **The guest app emitted nothing before this.** Stage 3 shipped the entire
  scan, browse and order journey with no analytics at all; the seven `table_*`
  events above are the business app's and describe how staff work the room. So
  this issue is mostly instrumentation, and only then a funnel.

- ### The Steps

  | #   | Step               | Event                                 | App          | One row is            |
  | --- | ------------------ | ------------------------------------- | ------------ | --------------------- |
  | 1   | Table code scanned | `table_code_scanned`                  | consumer     | an event              |
  | 2   | Session started    | `table_session_started`               | consumer     | an event              |
  | 3   | Order submitted    | `table_order_submitted`               | consumer     | an event              |
  | 4   | Visit closed       | `table_visit_closed`                  | **business** | a distinct `visit_id` |
  | 5   | Bite offered       | `table_bite_prompt_shown`             | consumer     | a distinct `visit_id` |
  | 6   | Bite draft started | `table_bite_started`                  | consumer     | an event              |
  | 7   | Bite published     | `bite_created` where `source = visit` | consumer     | an event              |

  The list lives as data in `tools/analytics/funnel.config.mjs`, and
  `analytics-events.spec.ts` fails if a step names an event this taxonomy does
  not have or if the query stops counting one.

- ### What Was Reused Rather Than Added

  **`table_visit_closed`**, which the business app already emits. The moment a
  visit ends is one moment whichever app is watching it, and a second event for
  it would have to be kept in step with the first forever. It is also what makes
  `visit_id` the join for the bottom half of the funnel: staff close the visit,
  the guest's phone offers the Bite, and only the id ties the two sides
  together.

  **`bite_created`**, which gained a `source` parameter rather than a
  `table_bite_published` beside it. A published Bite is a published Bite, and
  the launch dashboard's count of them must not change because the funnel
  wanted to read one. `source` is derived from the document rather than passed
  down from the screen that opened the form - a draft whose link was dropped,
  because the guest picked a different restaurant, is honestly `manual` no
  matter which button started it.

- ### What Each Step Counts, And What It Does Not

  **A scan is counted however it ended.** A sticker on a table that has been
  taken out of service is a guest the platform lost, and it looks identical to
  no scan at all if only the resolved ones are counted. `outcome` separates
  them. A refusal names **no restaurant**, because a token that resolves to
  nothing resolves to nothing - so both ids are absent on a `refused` or
  `failed` scan rather than sent empty, the same answer `guests` gives when a
  host recorded no party size, and `scans_resolved` is the figure a
  per-restaurant reading should use.

  **A replayed order is not counted twice.** The backend answering `replayed`
  means it had already applied that exact intent (`RD-TS-9`), so a guest whose
  phone lost the answer and retried is one dinner. Same rule as the staff
  transitions of issue 1096.

  **A prompt is counted once per visit per screen.** The table screen offers
  another look while the trigger is still writing the summary (`RD-TS-49`), so
  a guest who taps twice saw one offer. `surface` separates the summary at the
  table from the same meal opened in _My visits_ days later, which is how long
  the gap between eating and writing actually is.

  **Nothing is counted from a template.** A component cannot say "shown" once,
  because it re-renders; every one of these is emitted from the integration
  layer that owns the behaviour, which is the rule the rest of this page states.

- ### The Account Segmentation

  `has_account` is on every guest-side step and says exactly one thing:
  **whether a registered member was signed in at that moment**. Not whether
  somebody is signed in at all - a table guest holds an anonymous account from
  the scan onwards (`RD-TS-4`), so that would be true of everybody and mean
  nothing. It is read through `AuthService.getMember()`, which answers `null`
  for the anonymous account, and it carries no uid and nothing that could
  become one.

  That is what makes "account creation triggered by the Bite prompt is
  attributable" answerable: a `table_bite_prompt_shown` with `has_account:
false` followed by a `sign_up` in the same session is the offer working. The
  funnel query reports the population - `prompts_without_account` - and the
  join to `sign_up` is a GA4 exploration rather than a column, because the two
  events share a session and not a parameter.

- ### Where It Is Measured

  `tools/analytics/queries/order-to-bite-funnel.sql`, run with
  `npm run analytics:query -- order-to-bite-funnel [--days=n]`. Over the
  BigQuery export rather than the Data API, for the reason
  `table-operations.sql` is: two steps are a distinct count of `visit_id`, the
  Data API has no distinct-count metric, and the ids are deliberately
  unregistered as custom dimensions.

  **The launch dashboard is untouched.** `dashboard.config.mjs` still carries no
  `table_*` tile, and the funnel is its own configuration beside it - the
  sentence that file already carried stays true, because whether the table
  platform feeds the core product is a different question from whether the
  launch is healthy.

  Four parameters were added to `provision-ga4.mjs`: `has_account`, `status`,
  `surface` and `source`. Two of those are **shared parameter names** - GA4
  registers a dimension per parameter name across every event that sends one -
  so `outcome` now also carries how a scan resolved, and `surface` is already
  sent by the email-verification prompts and the coach marks. Nothing breaks,
  because every reading picks an event first; but a breakdown by `surface` with
  no event filter mixes three unrelated vocabularies. And GA4 does not backfill,
  so every event collected before the `--apply` reports `(not set)` forever.

- ### No personal guest data

  The rule of issue 1098, and what it does and does not exclude.

  `restaurant_id`, `table_id` and `visit_id` are opaque business identifiers:
  the first two are the restaurant's own, and a visit id names a party without
  naming anyone in it. `guests` is a party size, which identifies nobody and
  cannot be joined back to a person — covers per service is the measure it
  exists for. What is excluded is anything that could re-identify a guest: a
  name, a contact detail, an account id. None of it reaches this layer, because
  the staff view never asks for it.

  The staff member's own uid is also absent. `AuthService.setupAnalyticsAndCrashlytics`
  still skips `setUserId` in the business app, so a table event carries no
  actor. Who moved a disputed table is the audit trail's job
  (`tableStateTransitions`, issue 1092), which is the record a dispute is
  actually read from; analytics answers how a room is worked, not by whom.

  **The same rule on the guest side** (issue [#1114]), where the events are
  emitted from a phone the guest is holding and the temptation is larger. The
  funnel carries `restaurant_id`, `table_id`, `visit_id`, a `line_count` and a
  boolean. It carries **no dish names**: what somebody ordered is the
  restaurant's business and would be a food preference attached to a session,
  and the funnel counts orders rather than reading them. It carries no uid -
  not the anonymous one the scan mints, and not the member's - and no address,
  even on the step that follows the summary mail (`RD-TS-46`: the address is
  handed to the backend, used, and stored nowhere, this layer included).

  `has_account` is the one thing said about the person, and it is one bit:
  whether BiteTribe already had them. It cannot be joined back to anybody.

- ### Derived Measures

  All three measures issue 1098 asks for are ratios over an event parameter,
  and two of them need a distinct count of one. The GA4 Data API has neither a
  distinct-count metric nor any sight of a parameter that has not been
  registered as a custom dimension, so they are computed against the
  **BigQuery export**, which carries every parameter of every event regardless:

  `tools/analytics/queries/table-operations.sql`, run with
  `npm run analytics:query -- table-operations [--days=n]`.

  | Measure                    | Column                  | Formula                                                                |
  | -------------------------- | ----------------------- | ---------------------------------------------------------------------- |
  | Table turnover per service | `turnover_per_table`    | `table_seated` count / `table_count`                                   |
  | Share of tables ever used  | `tables_used_pct`       | distinct `table_id` / `table_count`                                    |
  | Average occupancy duration | `avg_occupancy_minutes` | mean `table_visit_closed` − `table_visit_opened`, joined on `visit_id` |

  A service is one calendar day. A restaurant serving past midnight splits
  across two rows; the visit crossing the boundary is counted on the day it
  opened, and a visit still open at the end of the window appears in
  `visits_unclosed` rather than dragging the average down.

- ### One property, two apps

  Both apps report to one GA4 property through one measurement id
  (`NX_APP_BITE_TRIBE_MEASSUREMENT_ID` is read by all three shells). Until
  issue 1098 the business app initialized no analytics at all — nothing
  provided `provideFirestoreAnalytics`, and `AnalyticsService` returned before
  ever touching the plugin — so it sent neither product nor auto-collected
  events. The first `table_*` event initializes the web SDK there, and from
  that moment the auto-collected `session_start`, `page_view` and
  `user_engagement` of every staff shift reach the property the launch
  dashboard reads.

  Those cannot be told apart by event name, so the surface is **said** rather
  than inferred: both apps set the user property `app_surface`
  (`consumer` / `business`) once, before their first event. It is user-scoped
  because what the launch tiles have to exclude is the _user_ —
  `activeUsers` counts people, not events — and it is set from both apps now
  even though nothing filters on it yet, because GA4 does not backfill and a
  filter added later over traffic that never carried the property would
  exclude nothing.

  The `Active users` and `Crash-free users` tiles below are the only two that
  count _people_ rather than events, and therefore the only two that had to say
  whose. Issue 1584 scoped them, and issue 1586 corrected how: the filter is
  `NOT app_surface IN (business)` rather than `app_surface = consumer`.

  That distinction is the whole of it. GA4 does not backfill a custom
  dimension, so every session collected before `app_surface` was registered
  carries no value at all - and so does every session from an app release that
  predates the property being set. `= consumer` excludes all of it: `Active
users` read **0** and `Crash-free users` **n/a** within a minute of the
  dimension being registered on 12 September 2026. The exclusion form keeps
  unlabelled traffic, which is the right answer, because unlabelled traffic
  _is_ consumer traffic - the business app sent nothing at all until issue 1098.

  One artefact to know when reading the numbers: `activeUsers` is an
  approximate distinct count and filtering changes the aggregation path, so a
  filtered figure differs slightly from an unfiltered one - 70 against 66 over
  the same window on the day it landed. The step is the filter, not traffic.

- ### Auto-collected (no code)

  Retention and launch monitoring rely on events GA4 collects automatically plus
  the existing exception handler:

- `first_open`, `session_start`, `screen_view` — GA4 automatic collection.
- `exception` — emitted by `FirebaseErrorHandlerService`.
- ## Launch Dashboard Spec

  Build a daily-monitoring dashboard in the Firebase console (Analytics
  dashboard) or Looker Studio with these tiles. This is executed by the product
  owner against the logged-in console; the taxonomy above drives it.

  | Metric                      | Category          | Source                              |
  | --------------------------- | ----------------- | ----------------------------------- |
  | New activated users         | Activation        | `sign_up` count                     |
  | Bites created               | Creation          | `bite_created` count                |
  | Bucket lists created        | Creation          | `bucketlist_created` count          |
  | Ratings submitted           | Creation          | `bucketlist_rated` count            |
  | Searches                    | Discovery         | `search_performed` count            |
  | Restaurant + Bite views     | Discovery         | `restaurant_viewed` + `bite_viewed` |
  | D1 / D7 retention           | Retention         | GA4 retention / cohort report       |
  | Active users                | Retention         | GA4 `activeUsers`                   |
  | Crash-free users            | Launch monitoring | `app_exception` users vs all users  |
  | Unhandled errors            | Launch monitoring | `exception` count                   |
  | Top unhandled errors        | Launch monitoring | `exception` by `description`        |
  | Crash traces and non-fatals | Launch monitoring | Crashlytics console                 |

  Keep the dashboard scoped to launch signals; resist adding vanity metrics.

  Every metric is a **total for the window**, not a per-day rate. Until 31
  August 2026 six of them were titled "/ day" and one "Daily active users",
  while the queries divided by nothing: `eventCount` sums the window, and GA4's
  `activeUsers` counts distinct users inside it, which on this property was 15
  for one day against 40 for seven. The wrong reading reached three SSOT pages
  as "5 Bites per day" before it was caught, so the titles now name what is
  measured and the digest states the basis under its header.

  The two stability rows are deliberately separate. `app_exception` is logged by
  Crashlytics when a native process crashes, so a user counted there had the
  same event the Crashlytics console reports, which makes it the honest basis
  for a crash-free rate. `exception` is logged by
  `FirebaseErrorHandlerService` for every unhandled Angular error on all three
  platforms; those are usually survivable, so folding them into the crash-free
  rate would understate it against the console. Stack traces and non-fatal
  `recordException` reports exist only in Crashlytics and stay a console
  pointer.

- ## Agent-Operable Metrics

  The dashboard spec above is also **dashboard-as-code** so agents (and humans)
  can check metrics without opening the console:

- `tools/analytics/dashboard.config.mjs` — the launch tiles as data, derived
  from this page. Single source of truth for the report CLI. It carries no
  `table_*` tile: the dashboard is scoped to launch signals, and how a
  restaurant works its room during service is not one.
- `tools/analytics/report.mjs` — queries the tiles against the GA4 Data API.
  Run `npm run analytics:report` (flags: `--days=<n>`, `--json`, `--dry-run`).
- `npm run analytics:report -- --dry-run` prints the planned queries and needs
  no credentials — safe for any agent to run.
- Live runs need `GA4_PROPERTY_ID` + a service-account key in
  `GOOGLE_APPLICATION_CREDENTIALS`; setup is in
  [`tools/analytics/README.md`](../../tools/analytics/README.md).

- `tools/analytics/queries/table-operations.sql` — the derived measures of
  issue 1098, over the BigQuery export rather than the Data API. Run with
  `npm run analytics:query -- table-operations`; `--dry-run` needs no
  credentials.

- `tools/analytics/funnel.config.mjs` — the order-to-Bite funnel of issue
  [#1114] as data, its own configuration rather than a section of the launch
  dashboard. It is read by `analytics-events.spec.ts`, which fails if a step
  names an event the taxonomy does not have or if the query stops counting one.
- `tools/analytics/queries/order-to-bite-funnel.sql` — that funnel as numbers,
  per restaurant per day. Run with
  `npm run analytics:query -- order-to-bite-funnel`; `--dry-run` needs no
  credentials.

  GA4 has no API to create the visual dashboard/exploration, so the config +
  report is the reproducible substitute. Provisioning event **parameters** as GA4
  custom dimensions and registering key events via the Analytics **Admin API** is
  a documented follow-up (needs Editor access on the property).

  `provision-ga4.mjs` registers only low-cardinality values. GA4 allows 50
  event-scoped dimensions and collapses a high-cardinality one into `(other)`
  rows, so `restaurant_id`, `table_id` and `visit_id` are deliberately not
  registered — they are read from the BigQuery export instead. `from_status`,
  `outcome` and the user-scoped `app_surface` are. Registering them needs one
  `npm run analytics:provision -- --apply`, and GA4 does not backfill, so every
  event collected before that reports `(not set)` for them forever.

- ## DebugView Verification Steps
  1. Build and run the app on a device/emulator (or web) signed into the Firebase
     project.
  2. Enable debug mode:
  - Android: `adb shell setprop debug.firebase.analytics.app <package-name>`.
    If logcat answers that app measurement is disabled by
    `setAnalyticsCollectionEnabled(false)`, the device is carrying a disable a
    dev build wrote into `com.google.android.gms.measurement.prefs`. Only a
    build that includes the [issue-1387](../records/issue-1387.md) fix re-enables it; clearing app data
    may not, because auto-backup can restore the preference.
  - iOS: add launch argument `-FIRDebugEnabled`.
  - Web: analytics debug is visible via the `google-analytics`/`g/collect`
    network calls; use the GA4 DebugView with the debug extension if needed. 3. Open Firebase console → Analytics → DebugView and select the debug device. 4. Exercise each flow and confirm the matching event appears with expected
    parameters:
  - Register a new account → `sign_up`.
  - Create a Bite → `bite_created`.
  - Create a bucket list → `bucketlist_created`; rate a BiteTrail →
    `bucketlist_rated`.
  - Type a search query (≥ 3 chars) → `search_performed`.
  - Open a restaurant/place → `restaurant_viewed`; open a Bite → `bite_viewed`.
  - Enter the onboarding assistant → `onboarding_assistant_started`; advance
    each step → `onboarding_step_completed` with the matching `step`; finish →
    `onboarding_assistant_completed`.
  - Dismiss a coach mark → `coach_mark_dismissed` with the matching `surface`. 5. Disable debug mode when done (Android: set the prop to `.none`).

- ### Verified in production, 12 September 2026

  All seven events confirmed against the deployed business app with a signed-in
  staff account, on restaurant `2k3pjK8y279XFlMrS1ke`.

  Read from the `g/collect` request payloads in the browser's network panel
  rather than from DebugView. That is the better instrument here and not a
  shortcut: the payload carries **every** parameter whether or not it is
  registered as a GA4 custom dimension, which is the only way to see
  `restaurant_id`, `table_id`, `visit_id`, `table_count` and `guests` at all -
  they are deliberately unregistered, so no GA4 report will ever show them.
  DebugView would have shown the event names and a subset of the parameters.

  | Event                    | Confirmed parameters                                                |
  | ------------------------ | ------------------------------------------------------------------- |
  | `table_seated`           | `from_status=available`, `guests=4`                                 |
  | `table_freed`            | `from_status=cleaning`, and `from_status=disabled` on the re-enable |
  | `table_reserved`         | `from_status=available`                                             |
  | `table_cleaning_started` | `from_status=occupied`                                              |
  | `table_disabled`         | `from_status=available`                                             |
  | `table_visit_opened`     | `visit_id`                                                          |
  | `table_visit_closed`     | `visit_id`, `outcome=closed`                                        |

  Every event carried `restaurant_id`, `table_id` and `table_count`.

  Four things the run established beyond the parameter table.

  **The visit ids chain.** Across two full cycles, each `table_visit_closed`
  named the visit its preceding `table_visit_opened` had opened, and the next
  seating opened a different one. No visit was opened or closed twice. That is
  the `visitBefore` comparison holding in production, which is the one piece of
  this taxonomy a unit test can only approximate.

  **`guests` is absent rather than zero.** The first seating was made without a
  party size and carried no `guests` parameter at all, which is the documented
  behaviour rather than a miss.

  **`from_status` earns its place.** `table_disabled` then `table_freed` with
  `from_status=disabled` is a table taken out of service and put back, and it is
  one event pair rather than two invented event names.

  **The measurement id is present.** Each request carried
  `tid=G-R05N7EW09S`, which is what issue 1588 fixed - the bundle deployed before
  it had no `NX_APP_BITE_TRIBE_MEASSUREMENT_ID` in its env object at all.

  One note for a future run: a newly registered GA4 custom dimension is not
  queryable through the Data API for up to 24 hours, and the realtime report
  rejects `customEvent:` dimensions outright. So the API can confirm that an
  event **arrived** within a minute or two, and cannot confirm its parameters at
  all on the day it was registered. Use the request payload for parameters, the
  realtime report for arrival, and `analytics:query -- table-operations` from the
  next day for the measures.

- ### DebugView, the order-to-Bite funnel

  The guest surfaces are the consumer app, so the ordinary DebugView steps
  above apply - but the flow needs a restaurant with table ordering switched on
  and a printed table token, which is the same setup the manual test of issue
  [#1103] uses. Read the `g/collect` payloads rather than DebugView for the
  parameters: `restaurant_id`, `table_id` and `visit_id` are deliberately
  unregistered, so no GA4 report will ever show them.

  In one pass, on one table:

- Scan a valid code → `table_code_scanned` with `outcome: confirm` and both ids.
- Scan a code for a table that is out of service → `table_code_scanned` with
  `outcome: refused` and **no** `restaurant_id` and no `table_id`.
- Confirm the table → `table_session_started` with `status`, and
  `has_account: false` while the guest is anonymous.
- Send an order → one `table_order_submitted` with the line count. Kill the
  connection mid-submit and retry → still one, because the replay is not
  counted.
- Have staff clear the table → `table_visit_closed` from the **business**
  session, carrying the same `visit_id` the next two events will.
- Open the summary → `table_bite_prompt_shown` with `surface: table`. Tap
  "look again" → no second event.
- Tap "create a Bite" → `table_bite_started`, then post it → `bite_created`
  with `source: visit`.
- Open the same meal from _My visits_ afterwards → `table_bite_prompt_shown`
  with `surface: visit_detail` and `has_account: true`.
- Write a Bite by hand from the home screen → `bite_created` with
  `source: manual`.

- ### DebugView, business app (table operations)

  The business app is web-only and its table events need a **non-dev** build to
  reach DebugView at all: the dev branch of `provide-firestore-utils.ts` calls
  `FirebaseAnalytics.setEnabled({ enabled: false })`, whose web implementation
  disables collection for that page load. Serve a production configuration
  (`NX_APP_BITE_TRIBE_IS_DEV` unset) against the real project, sign in as a
  staff account, and open `restaurant/:restaurantId/tables`.

  Then, on one table, and confirming each event carries `restaurant_id`,
  `table_id` and `table_count`:

- Seat a party with a count → `table_seated` (`from_status: available`,
  `guests`) **and** `table_visit_opened` with a `visit_id`.
- Mark it ordering, then occupied again → **nothing**, and no second
  `table_visit_opened`.
- Mark it cleaning → `table_cleaning_started` (`from_status: occupied`) **and**
  `table_visit_closed` with the same `visit_id` and `outcome: closed`.
- Free it → `table_freed` (`from_status: cleaning`) and no visit event.
- Reserve, then free a different table → `table_reserved`, then `table_freed`
  with `from_status: reserved`.
- Disable a table, then re-enable it → `table_disabled`, then `table_freed`
  with `from_status: disabled`.
- Go offline, seat two tables, come back online → two `table_seated` events on
  reconnect and not four.
- Confirm the session carries the `app_surface: business` user property, and
  that a consumer session carries `app_surface: consumer`.

- ## Related Pages
- [Architecture - Analytics](../architecture/analytics.md)
- [epic-907][#907]
- [Current State - Roadmap](../current-state/roadmap.md)
- [Implementation - Testing](testing.md)

[#907]: https://github.com/muhammedgaygisiz/travellers-apps/issues/907
[#1017]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1017
[#1071]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1071
[#1221]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1221
[#1073]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1073
[#1114]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1114
[#1103]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1103
