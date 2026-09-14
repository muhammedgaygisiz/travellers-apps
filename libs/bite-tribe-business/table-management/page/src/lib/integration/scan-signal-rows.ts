import { isOpenScanAnomaly } from 'model';
import type {
  RestaurantTable,
  ScanAnomaly,
  ScanAnomalyKind,
  TableSession,
} from 'model';
import { elapsedParts, type ElapsedParts } from './table-status-duration';

/**
 * The two lists issue #1107 adds to the staff screens, as rows a floor reads.
 *
 * Pure functions over documents the view already holds, for the reason
 * `assistance-rows.ts` and `order-queue-groups.ts` are pure: the rules these
 * lists live by - which table, how long, when a row stops being ordinary - are
 * assertable without rendering anything or reading Firestore.
 *
 * ## Why they are two lists and not one
 *
 * They look alike on screen - a table number, an age, a button - and they are
 * opposites. A pending session is a guest who scanned while waiting to be
 * seated, and the answer to it is to walk over and seat them; there is nothing
 * suspicious about it, and the issue that added both says so in as many words.
 * An anomaly is the restaurant being told something about its codes, and the
 * answer to it is usually to rotate one.
 *
 * Folding them together would have made the ordinary case look like an
 * incident, which is the reliable way to get a list stopped being read.
 *
 * ## Which words this file does not hold
 *
 * None of them. Every label is a Transloco key chosen here and filled in by the
 * caller, the same split `assistanceRows` and `orderActions` already use.
 */

/**
 * What each anomaly kind is called on the row that shows it.
 *
 * A table rather than a key built from a prefix in the template, for the reason
 * `ASSISTANCE_KIND_KEYS` is one: a kind the model gains and no locale file
 * covers is a compile error here rather than a blank row on the one screen
 * whose whole purpose is telling somebody something.
 */
export const SCAN_ANOMALY_KIND_KEYS: Readonly<Record<ScanAnomalyKind, string>> =
  {
    rateLimited: 'scan-anomaly-rateLimited',
    outsideOpeningHours: 'scan-anomaly-outsideOpeningHours',
    disabledTable: 'scan-anomaly-disabledTable',
    manySessions: 'scan-anomaly-manySessions',
    distantScan: 'scan-anomaly-distantScan',
  } as const;

/**
 * The kinds whose answer is to replace the code.
 *
 * Read by the row so it can say so, and stated here rather than in the template
 * because it is a product judgement about what each kind means. A code being
 * hammered, scanned at three in the morning, or scanned at a table that was
 * retired are all one story: the sticker is in circulation somewhere it should
 * not be, and rotating it ends the story.
 *
 * The other two are not. Eight phones at a four-top is usually eight phones at
 * a four-top, and a scan from across the city is one guest sharing a link with
 * a friend far more often than it is anything else - so the row reports them
 * and suggests nothing.
 */
export const ROTATION_WORTHY_ANOMALIES: readonly ScanAnomalyKind[] = [
  'rateLimited',
  'outsideOpeningHours',
  'disabledTable',
];

/**
 * How long a row keeps saying that something is happening *now*.
 *
 * Five minutes past the last time the kind was seen. Past it the row stays on
 * the list - a code that was hammered an hour ago is still a code worth
 * rotating - but stops being drawn as live, because a screen where an incident
 * from this morning and one from this second look identical is a screen that
 * says nothing about either.
 *
 * Deliberately several times the minute an anomaly is re-raised at, so a burst
 * that is genuinely continuing never falls out of it between raisings.
 */
export const SCAN_ANOMALY_ACTIVE_WITHIN_MS = 5 * 60_000;

/** One table's unusual scan, as a row. */
export interface ScanAnomalyRow {
  /** `{tableId}:{kind}`, so a table with two kinds has two stable rows. */
  id: string;
  tableId: string;
  /** The table's number as staff call it. Empty where the table has gone. */
  label: string;
  kind: ScanAnomalyKind;
  kindKey: string;
  /** How long since it was last seen, as a sentence to translate. */
  lastSeen: ElapsedParts;
  /** True while it is still being seen. See {@link SCAN_ANOMALY_ACTIVE_WITHIN_MS}. */
  active: boolean;
  /** How many separate times it has been raised. Never how many requests. */
  count: number;
  /** True when replacing the table's code is the answer to it. */
  suggestsRotation: boolean;
  /** Rounded metres, on a `distantScan`. */
  distanceMeters?: number;
  /** Live sessions on the table, on a `manySessions`. */
  sessionCount?: number;
}

/**
 * The open anomalies, most recently seen first, with their table numbers on.
 *
 * **Most recently seen first, which is neither of the other two lists.** The
 * tickets sort newest first because the one that just landed is unread; the
 * tables that are calling sort oldest first because the guest who has waited
 * longest is owed the walk. Neither applies here: nobody is waiting on a row,
 * so what belongs at the top is what is still happening - a row first raised
 * yesterday and seen again a minute ago is a live problem, and one that stopped
 * at lunchtime is not.
 *
 * Dismissed rows are dropped here rather than at the listener, because the
 * collection keeps them at their derived names: what the floor has not seen and
 * what the collection holds are two different questions.
 *
 * A table deleted from the plan since the row was raised still gets one, with
 * an empty label, exactly as the call list and the order queue do. Dropping it
 * would lose a report in order to tidy up a number - and a code whose table was
 * deleted is one of the cases most worth reading.
 */
export const scanAnomalyRows = (
  anomalies: readonly ScanAnomaly[],
  tables: readonly RestaurantTable[],
  now: number,
): ScanAnomalyRow[] => {
  const labels = new Map(tables.map((table) => [table.id, table.label]));

  return (
    anomalies
      .filter((anomaly) => isOpenScanAnomaly(anomaly))
      .slice()
      // Sorted on the instant rather than on the row, because the row carries
      // `ElapsedParts`, which is a sentence - and sorting sentences by the time
      // they describe is how a "2 h 5 min" ends up under a "3 min".
      .sort((first, second) => second.lastSeenAt - first.lastSeenAt)
      .map((anomaly) => ({
        id: `${anomaly.tableId}:${anomaly.kind}`,
        tableId: anomaly.tableId,
        // The stored label first, because it was copied when the row was raised
        // and is therefore still right for a table that has since been deleted.
        // The plan's own is preferred when it has one, because a table renumbered
        // since is a table staff now call something else.
        label: labels.get(anomaly.tableId) ?? anomaly.tableLabel ?? '',
        kind: anomaly.kind,
        kindKey: SCAN_ANOMALY_KIND_KEYS[anomaly.kind],
        lastSeen: elapsedParts(anomaly.lastSeenAt, now),
        active: now - anomaly.lastSeenAt < SCAN_ANOMALY_ACTIVE_WITHIN_MS,
        count: anomaly.count,
        suggestsRotation: ROTATION_WORTHY_ANOMALIES.includes(anomaly.kind),
        ...(anomaly.distanceMeters === undefined
          ? {}
          : { distanceMeters: anomaly.distanceMeters }),
        ...(anomaly.sessionCount === undefined
          ? {}
          : { sessionCount: anomaly.sessionCount }),
      }))
  );
};

/**
 * When a guest waiting to be seated stops being ordinary.
 *
 * Three minutes, the same as a table that is calling, and for the same
 * judgement: somebody who scanned a code three minutes ago and has not been
 * given a table has been walked past. A *display* threshold and nothing else -
 * nothing is escalated, refused or reordered by it, and the row says so because
 * a list where every row looks the same is a list where the guest who has been
 * standing there since before the rush is invisible.
 */
export const PENDING_SESSION_URGENT_AFTER_MS = 3 * 60_000;

/** One guest waiting to be seated, as a row. */
export interface PendingSessionRow {
  /** The session's own document id, which is stable per guest per table. */
  id: string;
  tableId: string;
  /** The table's number as staff call it. Empty where the table has gone. */
  label: string;
  /** How long since they scanned, as a sentence to translate. */
  waiting: ElapsedParts;
  /** True once they have waited longer than {@link PENDING_SESSION_URGENT_AFTER_MS}. */
  urgent: boolean;
  /** How many phones are waiting at this table. Two friends are one party. */
  guests: number;
}

/**
 * When the first phone at a table scanned.
 *
 * The party's age, rather than the newest arrival's: a fourth friend joining
 * must not reset how long the group has been standing at the door.
 */
const earliestScan = (party: readonly TableSession[]): number =>
  Math.min(...party.map((session) => session.startedAt));

/**
 * The guests waiting to be seated, one row per table, longest wait first.
 *
 * **Grouped by table rather than by guest**, which is the decision in this
 * file that a reader should find again. Three friends who each scan the code
 * on table 12 while standing at the door are one party, and three rows would
 * ask a host to seat a table three times. The count is kept on the row because
 * it is what a host needs in order to bring the right number of menus.
 *
 * **Longest wait first**, the call list's direction rather than the queue's,
 * because these are the same kind of thing: people waiting, worked from whoever
 * has waited longest. The wait is measured from the *earliest* scan at the
 * table, so a fourth friend arriving does not reset how long the party has been
 * standing there.
 *
 * A session naming a table that is no longer on the plan still gets a row with
 * an empty label. It is a guest holding a phone in a dining room either way.
 */
export const pendingSessionRows = (
  sessions: readonly TableSession[],
  tables: readonly RestaurantTable[],
  now: number,
): PendingSessionRow[] => {
  const labels = new Map(tables.map((table) => [table.id, table.label]));
  const byTable = new Map<string, TableSession[]>();

  for (const session of sessions) {
    const existing = byTable.get(session.tableId);

    if (existing) {
      existing.push(session);
    } else {
      byTable.set(session.tableId, [session]);
    }
  }

  return (
    [...byTable.entries()]
      // Sorted on the instant rather than on the row, because the row carries
      // `ElapsedParts`, which is a sentence - and sorting sentences by the time
      // they describe is how a "2 h 5 min" ends up under a "3 min".
      .sort(
        ([, first], [, second]) => earliestScan(first) - earliestScan(second),
      )
      .map(([tableId, party]) => {
        const startedAt = earliestScan(party);

        return {
          // The earliest session's own name, so the row is stable across
          // deliveries even as friends join the party behind it.
          id: party.reduce((earliest, session) =>
            session.startedAt < earliest.startedAt ? session : earliest,
          ).id,
          tableId,
          label: labels.get(tableId) ?? '',
          waiting: elapsedParts(startedAt, now),
          urgent: now - startedAt >= PENDING_SESSION_URGENT_AFTER_MS,
          guests: party.length,
        };
      })
  );
};
