/**
 * Strips personal data out of a runtime error message before it is reported.
 *
 * `exception` is the one event in the taxonomy whose parameter is not a closed
 * set. Every other event sends enums and booleans - `surface`, `reason`,
 * `step`, `verified` - but `description` is whatever a thrown error happened to
 * say, which routinely means an address, a uid, or a URL carrying a token. That
 * was already reaching GA4 before the `description` dimension was registered;
 * registering it only made it queryable, and the BigQuery export (issue #986)
 * now keeps it in a store with no expiry.
 *
 * The rules are deliberately blunt. A redactor that tries to be clever about
 * what is really identifying will let something through; one that over-redacts
 * costs a little diagnostic detail, and Crashlytics still holds the full stack
 * for anyone debugging a specific crash.
 */

/** Longest description that survives; the tail of a message is rarely the useful part. */
const MAX_LENGTH = 200;

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** JWTs and anything else shaped like one, which is where bearer tokens hide. */
const JWT = /\beyJ[\w-]*\.[\w-]+\.[\w-]*/g;

/** Query strings and fragments carry tokens far more often than they carry meaning. */
const URL_WITH_PARAMS = /(https?:\/\/[^\s?#]*)[?#][^\s]*/g;

/**
 * Long mixed-case-and-digit runs: Firebase uids (28 chars), push tokens, and
 * document ids. The digit requirement is what keeps ordinary long words - and
 * the class names that make a stack readable - out of the match.
 */
const OPAQUE_ID = /\b(?=[\w-]*\d)(?=[\w-]*[a-zA-Z])[\w-]{20,}\b/g;

export const redactErrorDescription = (description: string): string => {
  const redacted = description
    .replace(EMAIL, '[email]')
    .replace(JWT, '[token]')
    .replace(URL_WITH_PARAMS, '$1')
    .replace(OPAQUE_ID, '[id]');

  return redacted.length > MAX_LENGTH
    ? `${redacted.slice(0, MAX_LENGTH)}…`
    : redacted;
};
