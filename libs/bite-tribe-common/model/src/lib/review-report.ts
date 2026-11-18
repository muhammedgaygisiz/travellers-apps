/**
 * Why a review or reply was reported (GitHub issue #2117).
 *
 * The consumer app offers these and the admin app counts them. Repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/reviews/review-report.ts`,
 * because the Functions project cannot reach a library; the two lists have to
 * be changed together.
 */
export const REVIEW_REPORT_REASONS = [
  'harassment',
  'hate',
  'spam',
  'inappropriate',
  'other',
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];

/** What `reportReview` answers. False when this account had already reported it. */
export interface ReportReviewResult {
  reported: boolean;
}

/** The item a reported reply answers, for context. */
export interface ReportedReviewParent {
  reviewId: string;
  /** Empty for a deleted parent. */
  text: string;
  authorDisplayName: string;
}

/**
 * One reported review or reply as `listReviewReports` returns it to the admin
 * app. Aggregated per review; who filed the reports is not part of the shape.
 */
export interface ReportedReview {
  reviewId: string;
  /** False when the review was deleted or withdrawn and only its reports remain. */
  exists: boolean;
  text: string;
  /** Empty for a review whose author deleted their account. */
  authorUid: string;
  authorDisplayName: string;
  biteId: string;
  biteName: string;
  /** Absent for a top-level review. */
  parent?: ReportedReviewParent;
  reportCount: number;
  reasons: Record<ReviewReportReason, number>;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface ListReviewReportsResult {
  reviews: ReportedReview[];
  truncated: boolean;
}
