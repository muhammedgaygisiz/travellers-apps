/**
 * Why a Bite was reported (GitHub issue #1608).
 *
 * The consumer app offers these and the admin app counts them. Repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/bites/bite-report.ts`,
 * because the Functions project cannot reach a library; the two lists have to
 * be changed together.
 */
export const BITE_REPORT_REASONS = [
  'spam',
  'notFood',
  'inappropriate',
  'harassment',
  'other',
] as const;

export type BiteReportReason = (typeof BITE_REPORT_REASONS)[number];

/** What `reportBite` answers. False when this account had already reported it. */
export interface ReportBiteResult {
  reported: boolean;
}

/**
 * One reported Bite as `listBiteReports` returns it to the admin app.
 *
 * The reports are aggregated per Bite, and who filed them is deliberately not
 * part of the shape.
 */
export interface ReportedBite {
  biteId: string;
  /** False when the Bite was deleted and its reports were not yet cleared. */
  exists: boolean;
  name: string;
  place: string;
  description: string;
  tags: string[];
  imageSrc: string;
  /** Empty for a Bite whose author deleted their account. */
  authorUid: string;
  authorDisplayName: string;
  reportCount: number;
  reasons: Record<BiteReportReason, number>;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface ListBiteReportsResult {
  bites: ReportedBite[];
  truncated: boolean;
}
