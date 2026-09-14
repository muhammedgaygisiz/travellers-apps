import { createHash } from 'node:crypto';
import { logger } from 'firebase-functions';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/https';

/**
 * A rate limit on the QR scan endpoint that survives an instance
 * (GitHub issue #1107).
 *
 * ## What `scan-rate-limit.ts` could not do
 *
 * The in-memory counter of issue #1100 was written with its own limits stated
 * on it: it stops a loop against a warm instance and it does not stop a
 * distributed one, because Cloud Functions scales out and every new instance
 * starts counting from zero. An attacker who opens a fresh connection per
 * request, or simply sends enough of them to force the service to scale, is
 * counted from zero by each of them.
 *
 * This counts in Firestore, so every instance adds to one number.
 *
 * ## Both, in that order, and why neither is redundant
 *
 * The memory limit runs first and this runs second, on the requests it
 * admitted. That order is the whole cost argument. A flood against one warm
 * instance is absorbed for free after the thirtieth request - no reads, no
 * writes, nothing that scales with how hard somebody is trying - and the
 * durable counter is reached only by traffic that is spread thinly enough to
 * look ordinary to each instance, which is exactly the traffic the memory
 * counter cannot see.
 *
 * The consequence is that the durable limits are deliberately *higher* than the
 * memory ones. They are not a second opinion about the same requests; they are
 * the aggregate across however many instances are running, and setting them at
 * or below the per-instance limits would mean the cheap gate never got a chance
 * to fire.
 *
 * ## Three dimensions, and the third one is new
 *
 * Per token, per client and per IP. The first two are the memory counter's, for
 * the reasons it gives: a per-token count is somebody working on one table, and
 * a per-client count is somebody working *through* tokens, which spends one
 * request per token and would never trip a per-token count.
 *
 * The IP is the dimension issue #1107 adds, and it exists because `clientOf`
 * answers the uid *or* the IP - so an attacker holding one anonymous account
 * per request is bucketed by neither. Anonymous accounts are free and
 * unlimited, which is a deliberate property of this epic (`RD-TS-4`), so the
 * client dimension alone is a limit on well-behaved callers.
 *
 * ## What the IP dimension is worth, stated honestly
 *
 * A client-supplied `X-Forwarded-For` reaches Express's `req.ip`, so a caller
 * that sets the header lands in a bucket of its own choosing. That makes the IP
 * dimension a **cost raiser and not a boundary**: evading it requires varying a
 * header per request, which is trivial, and gains nothing against the token and
 * client counts, which are the two that matter and cannot be chosen by the
 * caller. It is here because the attack it does stop - one script, one machine,
 * no header games, many tokens, many throwaway accounts - is the common one,
 * and because a shared restaurant network is exactly the case where it must
 * stay generous rather than strict.
 *
 * ## An IP is never stored
 *
 * {@link bucketOf} hashes it, and the document is named after the hash. The
 * collection is server-only in `firestore.rules` and every document in it is
 * dead within two minutes, but neither of those is a reason to write an address
 * down: what the limiter needs is a key that is stable for a minute, and a hash
 * is one.
 *
 * The token and the uid are not hashed, and the asymmetry is deliberate. Both
 * are already stored, in documents that outlive these by months - the token
 * document itself, and the session named after the uid - so hashing them here
 * would hide nothing and cost the ability to read a counter next to the thing
 * it is counting. An IP address appears in no other document in this product.
 *
 * ## Storage
 *
 * ```text
 * /scanRateLimits/{dimension}_{bucket}_{windowStartedAt}
 * ```
 *
 * Named after the window it counts, rather than one document per bucket that is
 * reset. Three things follow. Every instance computes the same name from the
 * same clock, so they share a counter without coordinating. A window that has
 * passed is never read or written again, so nothing has to reset anything. And
 * a document is only ever created and incremented, never contended for by
 * writers that disagree - the read is stale by whatever a round trip costs and
 * the count runs slightly low under load, which for a rate limiter means
 * admitting a few more requests than the number says, and is worth more than
 * a transaction per scan.
 *
 * `expiresAt` is there for a TTL policy on `scanRateLimits.expiresAt`, which is
 * **created by hand** like the indexes and the rules of this epic. Until it
 * exists the collection grows, which is worth knowing: it is a document per
 * bucket per minute, so an ordinary restaurant adds a handful an hour and an
 * attack adds three a minute.
 */

/** How long one counting window lasts. Aligned, so instances agree on it. */
export const DURABLE_RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Resolutions of one token allowed per window across every instance.
 *
 * Sixty, against the thirty one instance allows on its own. A real table is
 * scanned a handful of times over a meal; the number is set where a party of
 * twelve all scanning at once, twice, is still comfortably inside it.
 */
export const DURABLE_TOKEN_LIMIT_PER_WINDOW = 60;

/** Resolutions from one account allowed per window, whatever they name. */
export const DURABLE_CLIENT_LIMIT_PER_WINDOW = 120;

/**
 * Resolutions from one address allowed per window.
 *
 * The most generous of the three, because it is the one dimension where the
 * legitimate case and the abusive case genuinely look alike: every guest in a
 * restaurant is behind one router, and a coach party arriving together is a
 * burst from a single address that must not be throttled.
 */
export const DURABLE_IP_LIMIT_PER_WINDOW = 300;

/** How long a counter document is kept before the TTL policy removes it. */
export const DURABLE_RATE_LIMIT_TTL_MS = 2 * DURABLE_RATE_LIMIT_WINDOW_MS;

/** Server-only, and refused to every client in `firestore.rules`. */
export const SCAN_RATE_LIMITS_COLLECTION = 'scanRateLimits';

/** The three things a scan is counted against. */
export type ScanRateLimitDimension = 'token' | 'client' | 'ip';

const LIMITS: Readonly<Record<ScanRateLimitDimension, number>> = {
  token: DURABLE_TOKEN_LIMIT_PER_WINDOW,
  client: DURABLE_CLIENT_LIMIT_PER_WINDOW,
  ip: DURABLE_IP_LIMIT_PER_WINDOW,
};

export interface DurableScanRateLimitCheck {
  /** The token being resolved. */
  token: string;
  /** The caller's uid, or `''` where there is no session. */
  client: string;
  /** The caller's address as far as it can be known, or `''`. */
  ip: string;
  now: number;
}

export interface DurableScanRateLimitResult {
  /** Whether this scan is inside every limit that applies to it. */
  within: boolean;
  /** Which limit refused it. Absent while `within` is true. */
  exceeded?: ScanRateLimitDimension;
  /**
   * Whether this is the request that crossed the line.
   *
   * True exactly once per bucket per window, give or take the instances that
   * read the same count in the same moment. It is what an anomaly is raised
   * from, so that reporting a flood costs one row rather than a row per
   * request - see `recordScanAnomaly`.
   */
  crossed: boolean;
  /** When the window this was counted in ends, in epoch milliseconds. */
  retryAt: number;
}

/**
 * The key one dimension is counted under.
 *
 * The IP is hashed and truncated; the other two are used as they are. See the
 * note at the top of this file for why the asymmetry is deliberate. Truncated
 * to sixteen hex characters because this is a bucket name and not a
 * fingerprint: a collision puts two addresses in one counter, which costs the
 * second one part of a minute's allowance once in several billion pairs.
 */
export const bucketOf = (
  dimension: ScanRateLimitDimension,
  value: string,
): string =>
  dimension === 'ip'
    ? createHash('sha256').update(value).digest('hex').slice(0, 16)
    : value;

/** The start of the window `now` falls in, shared by every instance. */
export const windowStartOf = (now: number): number =>
  Math.floor(now / DURABLE_RATE_LIMIT_WINDOW_MS) * DURABLE_RATE_LIMIT_WINDOW_MS;

/**
 * The caller's address, as well as it can be known.
 *
 * `rawRequest.ip` first, which the functions framework fills in from
 * `X-Forwarded-For` with `trust proxy` on, and the leftmost entry of the header
 * as a fallback for a runtime that does not. Both are caller-supplied in the
 * end - see the note at the top of this file on what that means and why the
 * dimension is still worth counting.
 */
export const ipOf = (request: CallableRequest<unknown>): string => {
  const raw = request.rawRequest as
    | {
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
      }
    | undefined;

  if (raw?.ip) {
    return raw.ip;
  }

  const forwarded = raw?.headers?.['x-forwarded-for'];
  const header = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  return (header ?? '').split(',')[0]?.trim() ?? '';
};

interface Counted {
  dimension: ScanRateLimitDimension;
  reference: FirebaseFirestore.DocumentReference;
  limit: number;
}

/**
 * Counts one scan against every dimension it has, and says whether it is
 * inside all of them.
 *
 * Reads the three counters in one round trip and writes the three increments in
 * one more, so the cost is two round trips whatever a scan names.
 *
 * Every dimension is counted even when an earlier one has already refused, for
 * the reason the memory limiter counts both of its: a token over its limit must
 * not shield the client or the address behind it, because those are what the
 * *next* token is judged against.
 *
 * A failure against Firestore admits the scan. A limiter that cannot reach its
 * counters and therefore refuses every guest in the product is a worse outage
 * than the one it was reacting to, and App Check plus the memory limit are
 * still in front of it.
 */
export const withinDurableScanRateLimit = async ({
  token,
  client,
  ip,
  now,
}: DurableScanRateLimitCheck): Promise<DurableScanRateLimitResult> => {
  const windowStartedAt = windowStartOf(now);
  const retryAt = windowStartedAt + DURABLE_RATE_LIMIT_WINDOW_MS;
  const firestore = getFirestore();
  const collection = firestore.collection(SCAN_RATE_LIMITS_COLLECTION);

  const counted: Counted[] = (
    [
      ['token', token],
      ['client', client],
      ['ip', ip],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([dimension, value]) => ({
      dimension,
      limit: LIMITS[dimension],
      reference: collection.doc(
        `${dimension}_${bucketOf(dimension, value)}_${windowStartedAt}`,
      ),
    }));

  if (!counted.length) {
    return { within: true, crossed: false, retryAt };
  }

  try {
    const stored = await firestore.getAll(
      ...counted.map(({ reference }) => reference),
    );

    // Written before the verdict is returned, and unconditionally: a refused
    // attempt is counted for the reason the memory limiter counts one, which is
    // that a caller who keeps trying must not be able to let its own window
    // lapse and earn a fresh allowance.
    const batch = firestore.batch();
    const expiresAt = Timestamp.fromMillis(now + DURABLE_RATE_LIMIT_TTL_MS);

    counted.forEach(({ dimension, reference }, index) => {
      batch.set(
        reference,
        {
          dimension,
          windowStartedAt,
          expiresAt,
          count:
            (typeof stored[index]?.data()?.['count'] === 'number'
              ? (stored[index]?.data()?.['count'] as number)
              : 0) + 1,
        },
        { merge: true },
      );
    });

    await batch.commit();

    const over = counted
      .map(({ dimension, limit }, index) => ({
        dimension,
        limit,
        count:
          (typeof stored[index]?.data()?.['count'] === 'number'
            ? (stored[index]?.data()?.['count'] as number)
            : 0) + 1,
      }))
      .find(({ count, limit }) => count > limit);

    return over
      ? {
          within: false,
          exceeded: over.dimension,
          crossed: over.count === over.limit + 1,
          retryAt,
        }
      : { within: true, crossed: false, retryAt };
  } catch (error) {
    logger.warn('durable scan rate limit: counters unreachable', { error });

    return { within: true, crossed: false, retryAt };
  }
};

/**
 * Empties the counters. For tests; nothing in production calls it.
 *
 * The counterpart to `resetScanRateLimit`, and every emulator spec that starts
 * a session or resolves a token needs both. The memory counter is cleared by
 * emptying a map; this one is a collection, and one that the specs' own
 * `clear()` would not otherwise touch because it lives beside `tableTokens`
 * rather than under a restaurant.
 *
 * It matters more than it looks. A spec file that injects one instant for every
 * test - which the session and order specs do, so that the restaurant is open -
 * puts every scan in one window, so the counters would accumulate across the
 * whole file and the sixtieth test would be refused for a reason that has
 * nothing to do with what it was asserting.
 */
export const resetDurableScanRateLimit = async (): Promise<void> => {
  const firestore = getFirestore();

  await firestore.recursiveDelete(
    firestore.collection(SCAN_RATE_LIMITS_COLLECTION),
  );
};
