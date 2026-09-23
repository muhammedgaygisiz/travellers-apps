/**
 * The activation funnel and the retention cohorts, as data (GitHub issue #987).
 *
 * Its own file rather than a section of `dashboard.config.mjs` for the reason
 * `funnel.config.mjs` is: a dashboard tile is a total for a window, and both
 * of these are populations followed over time. A tile can say 15 people signed
 * up; only a cohort can say whether they were the people who arrived.
 *
 * ## Why the steps are data rather than only a query
 *
 * Both are measured over the BigQuery export
 * (`queries/activation-funnel.sql`, `queries/retention-cohorts.sql`), because
 * neither is expressible in the GA4 Data API: a funnel needs one user's events
 * joined to that same user's later events, and a cohort needs a distinct count
 * of users intersected across two days. SQL cannot import this file, so the
 * lists here are what a reader reads and `analytics-events.spec.ts` is what
 * keeps the three in step - it fails if a step names an event the taxonomy
 * does not have, if a query stops counting a declared step, or if a
 * conversion step stops being one of the GA4 key events
 * `provision-ga4.mjs` registers.
 *
 * ## Why two steps are not in the taxonomy
 *
 * `first_open` and `first_visit` are GA4's own automatic events, not ours.
 * They are the only honest start for an activation funnel - arrival happens
 * before any code of ours runs - and the app cannot emit them, so they are
 * marked `origin: 'ga4'` and the drift check skips them rather than failing on
 * an event the taxonomy is right not to declare.
 *
 * The two are one step, not two. GA4 logs `first_open` on iOS and Android and
 * `first_visit` on the web for the same moment, and counting only the first
 * would drop every web arrival - the population the funnel most needed to
 * measure when it was written, since the web converted at roughly a twentieth
 * of the iOS rate in the fortnight before this was built: 1 sign-up from 55
 * web arrivals, against 15 from 40 on iOS.
 */

/**
 * @typedef {Object} ActivationStep
 * @property {string} id
 * @property {string} title
 * @property {string[]} events      the analytics events that satisfy the step
 * @property {'taxonomy'|'ga4'} origin  whose event it is: ours, or GA4's own
 * @property {boolean} [conversion] a step the product counts as a conversion,
 *                                  and therefore one that must be a GA4 key
 *                                  event (issue #910)
 * @property {string} note          what the step means, and what it does not
 */

/** @type {ActivationStep[]} */
export const ACTIVATION_STEPS = [
  {
    id: 'arrived',
    title: 'Arrived',
    events: ['first_open', 'first_visit'],
    origin: 'ga4',
    note: "The first time GA4 saw this person at all - `first_open` from the app, `first_visit` from the web. It is the funnel's denominator and the cohort's membership in one: everything below is that same person coming back to it.",
  },
  {
    id: 'onboarding-started',
    title: 'Onboarding started',
    events: ['onboarding_assistant_started'],
    origin: 'taxonomy',
    note: 'The guided first run began. The step between arriving and signing up, and the one that says whether a drop-off is the landing surface or the account.',
  },
  {
    id: 'onboarding-completed',
    title: 'Onboarding completed',
    events: ['onboarding_assistant_completed'],
    origin: 'taxonomy',
    note: 'The assistant was finished rather than abandoned. Counted separately from the start so a funnel that loses people inside onboarding is distinguishable from one that never gets them into it.',
  },
  {
    id: 'signed-up',
    title: 'Signed up',
    events: ['sign_up'],
    origin: 'taxonomy',
    conversion: true,
    note: 'An account exists. The activation event of the launch dashboard, read here per arriving person instead of as a window total.',
  },
  {
    id: 'first-bite',
    title: 'First Bite published',
    events: ['bite_created'],
    origin: 'taxonomy',
    conversion: true,
    note: "The person did the thing the product is for. Any `bite_created`, whatever its `source`: a Bite typed by hand and a Bite made from a meal are both this person becoming a user. Which route they took is `funnel.config.mjs`'s question, not this one.",
  },
];

/**
 * The days after arrival a cohort is checked on.
 *
 * Classic retention rather than rolling: the cohort is counted on exactly that
 * day, which is what GA4's own cohort exploration shows and therefore what a
 * number from here can be compared against. Rolling retention - active on that
 * day *or later* - answers a different question and would read several points
 * higher on the same data.
 */
export const RETENTION_HORIZONS = [1, 7, 30];

/**
 * The horizons the daily digest prints.
 *
 * D30 is computed and checked in, but stays out of the digest until the export
 * is deep enough to have matured a single D30 cohort: the export began on
 * 31 August 2026, so the first one matures on 30 September 2026. A column of
 * `n/a` in a daily artifact trains a reader to skip the section.
 */
export const DIGEST_HORIZONS = [1, 7];

/** How each half is run. */
export const ACTIVATION_FUNNEL_QUERY = 'activation-funnel';
export const RETENTION_COHORTS_QUERY = 'retention-cohorts';
