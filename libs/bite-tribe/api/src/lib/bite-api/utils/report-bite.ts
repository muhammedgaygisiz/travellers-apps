import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteReportReason, ReportBiteResult } from 'model';

interface ReportBiteRequest {
  biteId: string;
  reason: BiteReportReason;
}

/**
 * Reports a Bite to the BiteTribe operators through `reportBite` (GitHub issue
 * #1608).
 *
 * Errors are not swallowed. A reporter who is told their report went through
 * when it did not will not report the Bite again.
 */
export const reportBite = async (
  biteId: string,
  reason: BiteReportReason,
): Promise<ReportBiteResult> => {
  const result = await FirebaseFunctions.callByName<
    ReportBiteRequest,
    ReportBiteResult
  >({
    name: 'reportBite',
    data: { biteId, reason },
  });

  return result.data;
};
