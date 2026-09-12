/**
 * A fixed-window counter for the QR scan endpoint (GitHub issue #1100).
 *
 * ## What this is and is not
 *
 * `resolveTableQrToken` is the one callable a guest reaches with no account, so
 * it is the one callable whose caller cannot be named, throttled by uid, or
 * blocked. App Check keeps it to requests from the BiteTribe app, and this
 * keeps one app - or one token - from being hammered through it.
 *
 * It counts **in the function instance's own memory**, which bounds what it can
 * honestly claim: it stops a loop run against a warm instance and it does not
 * stop a distributed one, because Cloud Functions scales out and each instance
 * starts counting from zero. That is deliberate rather than overlooked. A
 * durable limit means a write per scan, and the whole point of the resolution
 * is that it stays a handful of reads; issue #1107 owns the abuse protection
 * that is allowed to cost more, and it is the place to put a shared counter, a
 * blocklist and staff visibility of pending sessions.
 *
 * So: cheap, no reads, no writes, and worth having on its own terms. What it
 * must not become is the thing anybody points at when asked whether QR abuse is
 * handled.
 *
 * ## Why two limits rather than one
 *
 * They catch different things. The per-token limit is somebody working on one
 * table - a code photographed and shared, a script re-resolving it; the
 * per-client limit is somebody working through *many* tokens, which is the
 * enumeration attempt, and which spends one request per token and so would
 * never trip a per-token count.
 */

/** How long one counting window lasts. */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Resolutions of one token allowed per window. */
export const TOKEN_LIMIT_PER_WINDOW = 30;

/** Resolutions from one client allowed per window, whatever they name. */
export const CLIENT_LIMIT_PER_WINDOW = 60;

/**
 * Entries kept before the oldest are dropped.
 *
 * A bound rather than a promise about accuracy. The map is swept every window,
 * so this is only reached by a burst wide enough that the memory of an instance
 * matters more than the precision of a counter it was already going to forget.
 */
const MAX_ENTRIES = 10_000;

interface Window {
  count: number;
  /** When the current window started, in epoch milliseconds. */
  startedAt: number;
}

const windows = new Map<string, Window>();

const sweep = (now: number): void => {
  for (const [key, window] of windows) {
    if (now - window.startedAt >= RATE_LIMIT_WINDOW_MS) {
      windows.delete(key);
    }
  }

  if (windows.size <= MAX_ENTRIES) {
    return;
  }

  // Insertion order, so the oldest keys go first.
  for (const key of [...windows.keys()].slice(0, windows.size - MAX_ENTRIES)) {
    windows.delete(key);
  }
};

/**
 * Counts one hit and says whether it is over the limit.
 *
 * The hit is counted either way. A caller that keeps trying keeps its window
 * alive, so hammering does not become a way to reset the count by waiting for
 * refusals to stop being counted.
 */
const hit = (key: string, limit: number, now: number): boolean => {
  sweep(now);

  const current = windows.get(key);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    windows.set(key, { count: 1, startedAt: now });

    return true;
  }

  current.count++;

  return current.count <= limit;
};

export interface ScanRateLimitCheck {
  /** The token being resolved. */
  token: string;
  /**
   * Who is asking, as well as it can be known: the caller's uid where there is
   * a session, and otherwise the request's IP. Neither is an identity - a
   * guest has no account and a restaurant's guests share one network - so this
   * is a bucket, not a subject, and it is never stored.
   */
  client: string;
  now: number;
}

/** Whether this scan is within both limits. Counts it against both either way. */
export const withinScanRateLimit = ({
  token,
  client,
  now,
}: ScanRateLimitCheck): boolean => {
  // Both are evaluated; `&&` would let a token over its limit hide a client
  // that is also over its own, and the client window is the one that matters
  // for the next token.
  const tokenOk = hit(`token:${token}`, TOKEN_LIMIT_PER_WINDOW, now);
  const clientOk = hit(`client:${client}`, CLIENT_LIMIT_PER_WINDOW, now);

  return tokenOk && clientOk;
};

/** Empties the counters. For tests; nothing in production calls it. */
export const resetScanRateLimit = (): void => windows.clear();
