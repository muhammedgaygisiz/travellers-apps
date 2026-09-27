/**
 * Link-preview crawlers on the web surface, and the fingerprint that tells
 * them apart from people (GitHub issue #1709).
 *
 * ## What they are
 *
 * When a BiteTribe link is posted to Instagram or Facebook, Meta opens it from
 * its own data centres to build the preview. The crawler runs the page's
 * JavaScript, so GA4 logs a `first_visit` for each one. It fails reCAPTCHA,
 * so App Check blocks it and some land in the SDK's one-day throttle. It
 * never engages. In the fortnight to 2026-09-26, 32 of 76 new web users were
 * these, arriving within seconds of each other on the shared links right
 * after an Instagram post (#913). Counted as arrivals, they pulled the web
 * arrive → sign-up rate toward zero. Counted as throttled clients, they made
 * App Check look like it was locking people out.
 *
 * ## Why the fingerprint is the city
 *
 * The obvious signal is App Check itself: every crawler was blocked. It cannot
 * be the rule, because the App Check tile exists to catch *people* being
 * blocked, and a filter built on the block would define that number as zero.
 * The city GA4 resolves from the IP is independent of App Check and was the
 * sharpest signal in the data: every crawler resolved to a data-centre town.
 * Browser and OS were no help, since the crawlers present as ordinary Windows
 * Chrome or iOS Safari.
 *
 * The rule only applies to the web platform. App arrivals come from a store
 * install, which a crawler does not make.
 *
 * ## Known limits
 *
 * A real person browsing from one of these towns is counted as a crawler. For
 * most of the towns that is rare, but Dublin and Fort Worth are real cities,
 * so the list assumes this app's audience (so far mostly Switzerland, Germany
 * and Italy). Revisit those two if the app gets users in Ireland or Texas.
 *
 * A crawler from a town not on the list still counts as a person. When a
 * digest shows a new burst of zero-engagement web arrivals, add their town
 * here. `analytics-events.spec.ts` fails until both queries list it too.
 */

/**
 * GA4's `city` values for the data-centre towns crawler traffic resolved to.
 * The same strings in the Data API (`city`) and the BigQuery export
 * (`geo.city`).
 */
export const DATA_CENTRE_CITIES = [
  // Meta
  'Prineville',
  'Lulea',
  'Forest City',
  'Altoona',
  'Fort Worth',
  'Gretna',
  'Dublin',
  // Other hyperscalers, seen with the same zero-engagement pattern
  'Boardman',
  'Council Bluffs',
  'Flint Hill',
];
