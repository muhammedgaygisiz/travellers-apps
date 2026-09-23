/**
 * The order-to-Bite conversion funnel, as data (GitHub issue #1114).
 *
 * Its own file rather than a section of `dashboard.config.mjs`, and the reason
 * is the sentence that file already carries: the launch dashboard is scoped to
 * launch signals and deliberately holds no `table_*` tile. Whether the table
 * platform feeds the core product is the question stage 4 of epic #1073 exists
 * to answer, and it is a different question from "is the launch healthy" -
 * measured over different events, against a different denominator, and read at
 * a different cadence.
 *
 * ## Why the steps are data rather than a query
 *
 * The funnel is measured over the BigQuery export
 * (`queries/order-to-bite-funnel.sql`) because two of its steps need a distinct
 * count of `visit_id` and the GA4 Data API has no distinct-count metric - the
 * same reason `table-operations.sql` exists. SQL cannot import this file, so
 * the list here is the one somebody reads and
 * `analytics-events.spec.ts` is what keeps the two in step: it fails if a step
 * names an event the taxonomy does not have, or if the query stops counting
 * one the funnel declares.
 *
 * ## Why one step is emitted by the other app
 *
 * `table_visit_closed` is the business app's, and it is reused rather than
 * duplicated: the moment a visit ends is one moment, whichever app is watching
 * it. That is also what makes `visit_id` the join for the bottom half of the
 * funnel - staff close the visit, the guest's phone offers the Bite, and only
 * the id ties the two sides together.
 *
 * ## What each step can and cannot be divided by
 *
 * Every guest-side event carries `restaurant_id` and `has_account`, so any
 * step can be read per restaurant and split by whether BiteTribe already had
 * that person. `table_code_scanned` is the exception on the first count: a
 * token that resolves to nothing names no restaurant, so a `refused` or
 * `failed` scan carries no `restaurant_id` at all and drops out of a
 * per-restaurant reading rather than landing under an invented one.
 */

/**
 * @typedef {Object} FunnelStep
 * @property {string} id
 * @property {string} title
 * @property {string} event            the analytics event the step counts
 * @property {'consumer'|'business'} surface  which app emits it
 * @property {'event'|'visit'} unit    what one row of the step is: an event, or
 *                                     a distinct `visit_id`
 * @property {string} note             what the step means, and what it does not
 */

/** @type {FunnelStep[]} */
export const ORDER_TO_BITE_STEPS = [
  {
    id: 'scanned',
    title: 'Table codes scanned',
    event: 'table_code_scanned',
    surface: 'consumer',
    unit: 'event',
    note: 'Every scan, however it ended. A sticker on a table that has been taken out of service is a guest the platform lost, and it looks like no scan at all if only the resolved ones are counted - so `outcome` separates them rather than a filter removing them.',
  },
  {
    id: 'session-started',
    title: 'Sessions started',
    event: 'table_session_started',
    surface: 'consumer',
    unit: 'event',
    note: 'The guest confirmed the restaurant and table and the backend opened a session. `status` says whether staff had already seated the table or have only been told about it (`RD-TS-1`).',
  },
  {
    id: 'ordered',
    title: 'Orders submitted',
    event: 'table_order_submitted',
    surface: 'consumer',
    unit: 'event',
    note: 'An order the kitchen received. A replay is not counted again: the backend answering `replayed` means it had already applied that exact intent (`RD-TS-9`), so a guest whose phone lost the answer is one dinner rather than two.',
  },
  {
    id: 'visit-closed',
    title: 'Visits closed',
    event: 'table_visit_closed',
    surface: 'business',
    unit: 'visit',
    note: 'Staff cleared the table. Emitted by the business app, and reused rather than duplicated on the guest side. Distinct by `visit_id`, because the same visit closing is one meal ending.',
  },
  {
    id: 'bite-offered',
    title: 'Bite prompts shown',
    event: 'table_bite_prompt_shown',
    surface: 'consumer',
    unit: 'visit',
    note: 'The summary reached a guest with the offer on it, at the table or in *My visits* afterwards (`surface`). Once per visit per screen: the table screen offers another look while the trigger is still writing the summary, and a guest who taps twice saw one offer.',
  },
  {
    id: 'bite-started',
    title: 'Bite drafts started',
    event: 'table_bite_started',
    surface: 'consumer',
    unit: 'event',
    note: 'The offer was taken up and the form opened. Counted here rather than at the post, because the gap between accepting an offer and publishing is the one this funnel exists to show.',
  },
  {
    id: 'bite-published',
    title: 'Bites published from a meal',
    event: 'bite_created',
    surface: 'consumer',
    unit: 'event',
    note: 'The Bite reached the collection. Read off `bite_created` with `source = visit` rather than a second event for the same moment, so the launch dashboard\'s count of Bites does not change because the funnel wanted to read one.',
  },
];

/**
 * The parameter and value that separate a Bite made from a meal from every
 * other Bite. Applied to the last step alone.
 */
export const BITE_FROM_MEAL = { parameter: 'source', value: 'visit' };

/** The one step the business app emits, named so a reader is not surprised. */
export const BUSINESS_STEP = 'table_visit_closed';

/**
 * How the funnel is run.
 *
 * Kept beside the steps so the answer to "and where do I see this" is in the
 * file that describes it.
 */
export const ORDER_TO_BITE_QUERY = 'order-to-bite-funnel';
