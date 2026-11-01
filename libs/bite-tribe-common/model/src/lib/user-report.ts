/**
 * Why a profile was reported (GitHub issue #1829).
 *
 * The consumer app offers these and the admin app counts them. Repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/users/user-report.ts`,
 * because the Functions project cannot reach a library; the two lists have to
 * be changed together.
 */
export const USER_REPORT_REASONS = [
  'harassment',
  'impersonation',
  'spam',
  'inappropriate',
  'other',
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number];

/** What `reportUser` answers. False when this account had already reported it. */
export interface ReportUserResult {
  reported: boolean;
}

export interface ReportedUserBite {
  biteId: string;
  name: string;
  imageSrc: string;
}

/**
 * One reported profile as `listUserReports` returns it to the admin app.
 *
 * The reports are aggregated per account, and who filed them is deliberately
 * not part of the shape.
 */
export interface ReportedUser {
  uid: string;
  /** False when the profile was deleted and its reports were not yet cleared. */
  exists: boolean;
  displayName: string;
  photoUrl: string;
  about: string;
  /** The account is already blocked from signing in. */
  blocked: boolean;
  recentBites: ReportedUserBite[];
  reportCount: number;
  reasons: Record<UserReportReason, number>;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface ListUserReportsResult {
  users: ReportedUser[];
  truncated: boolean;
}
