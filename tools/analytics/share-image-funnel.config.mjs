/**
 * The share-as-image funnel, as data (GitHub issue #1733, `UC-SBS` `R-29`).
 *
 * Its own file, for the reason `funnel.config.mjs` is one: the launch
 * dashboard is scoped to launch signals, and whether sharing a Bite as an image
 * brings enough reach to be worth its upkeep is a product question about one
 * feature, read over its own events and at its own cadence. It is also not a
 * section of `funnel.config.mjs`, whose every `event:` line
 * `analytics-events.spec.ts` reads as a step of the order-to-Bite funnel.
 *
 * ## Why the steps are data rather than a query
 *
 * The funnel is measured over the BigQuery export
 * (`queries/share-image-funnel.sql`), because `bite_id` is deliberately not a
 * GA4 custom dimension and the distinct count of Bites shared needs it. SQL
 * cannot import this file, so the list here is the one somebody reads and
 * `analytics-events.spec.ts` keeps the two in step: it fails if a step names
 * an event the taxonomy does not have, or if the query stops counting one.
 *
 * ## What the last step is, and what it cannot be
 *
 * **The hand-off, not the post.** Instagram and Facebook do not tell the app
 * that hands them an image whether the user published it, so "succeeded"
 * means the image was saved, or the share sheet reported that an app took it.
 * Posting is the user's own act in the other app (`UC-SBS` `G4`), and no event
 * here can see it. Visits that come back through the QR code are the shared
 * link entry's to count, not this funnel's.
 *
 * ## What every step carries
 *
 * Identifiers and enums only (`UC-SBS` `R-24`): `bite_id`, and from the menu
 * choice on `target`, then `format`, then `template`. No dish name, place or
 * display name ever reaches a parameter, though the image itself may show all
 * three.
 */

/**
 * @typedef {Object} FunnelStep
 * @property {string} id
 * @property {string} title
 * @property {string} event     the analytics event the step counts
 * @property {boolean} optional whether a share can skip the step
 * @property {string} note      what the step means, and what it does not
 */

/** @type {FunnelStep[]} */
export const SHARE_IMAGE_STEPS = [
  {
    id: 'menu-opened',
    title: 'Share menus opened',
    event: 'share_menu_opened',
    optional: false,
    note: "The share menu reached the screen, on one of the viewer's own Bites. The link share on somebody else's Bite opens no menu and is not counted. A menu dismissed without a choice is the first drop-off: it emits nothing after this.",
  },
  {
    id: 'target-chosen',
    title: 'Menu entries picked',
    event: 'share_target_chosen',
    optional: false,
    note: '`target` names the entry: an app, or in a browser Save image and Share image…, or `more` for the link share. A `more` leaves this funnel here, because the link share has no composer.',
  },
  {
    id: 'composer-opened',
    title: 'Composers opened',
    event: 'share_composer_opened',
    optional: false,
    note: 'The composer reached the screen in the format the entry decided (`format`: `story` or `post`).',
  },
  {
    id: 'template-chosen',
    title: 'Layouts picked',
    event: 'share_template_chosen',
    optional: true,
    note: 'One event per switch of layout, so a composer can emit several or none. The layout it opens on was not chosen and is not counted; the hand-off names whichever layout went out either way.',
  },
  {
    id: 'handed-off',
    title: 'Images handed off',
    event: 'share_handoff_succeeded',
    optional: false,
    note: 'The image was saved (`action = save`) or the share sheet reported that an app took it (`action = share`). Not that anything was posted: the target apps do not say.',
  },
];

/**
 * The event beside the last step: an image that did not leave, and why
 * (`reason`). `cancelled` is the user closing the share sheet - a drop-off
 * rather than a fault, and counted apart from the faults for that reason.
 */
export const SHARE_IMAGE_FAILURE_EVENT = 'share_handoff_failed';

/**
 * How the funnel is run.
 *
 * Kept beside the steps so the answer to "and where do I see this" is in the
 * file that describes it.
 */
export const SHARE_IMAGE_QUERY = 'share-image-funnel';
