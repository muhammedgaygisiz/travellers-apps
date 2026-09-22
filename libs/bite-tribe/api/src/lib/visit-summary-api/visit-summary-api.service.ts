import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type {
  EmailVisitSummaryResult,
  ListVisitSummariesResult,
  ReadVisitSummaryResult,
} from 'model';
import {
  type TableSessionCallError,
  tableSessionCallFailed,
} from '../table-session-api/table-session-api.service';

/**
 * What a guest keeps after the meal (GitHub issue #1111).
 *
 * ## Three calls and no listener
 *
 * Like the bill of issue #1110 and for a sharper version of its reason: there
 * is nothing left to watch. The visit has ended, the summary is written once
 * by a trigger and never changes, and the only thing that can move afterwards
 * is `emailedAt` - which this client is what moves.
 *
 * `firestore.rules` refuses every client read of the subcollection, so these
 * callables are not the path the app happens to take but the only path there
 * is. The rule they exist for is the retention one: a member keeps their
 * summaries for as long as the account exists and an unregistered guest until
 * the session that produced them goes idle (`RD-TS-46`), and rules cannot
 * compute an idle timeout against a per-restaurant setting.
 *
 * ## Why a refusal comes back as a value
 *
 * The same reason it does on the scan, the order, the assistance request and
 * the bill. A guest whose session went idle while their phone was in their
 * pocket has not hit an error, and neither has one who has already had the
 * mail. Only the transport failing rejects, and `tableSessionCallFailed` turns
 * that into the three sentences the other table screens already use.
 */
@Injectable({ providedIn: 'root' })
export class VisitSummaryApiService {
  /**
   * One meal.
   *
   * The restaurant and the table travel with the request even though the
   * summary is addressed by the visit alone: an unregistered guest is held to
   * their session, and the session document is named after the table they
   * scanned. A member needs neither and sends them anyway, because the screen
   * that calls this has both in hand and a second call signature would be a
   * second thing to keep in step.
   */
  async read(
    visitId: string,
    restaurantId: string,
    tableId: string,
  ): Promise<ReadVisitSummaryResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        { visitId: string; restaurantId: string; tableId: string },
        ReadVisitSummaryResult
      >({
        name: 'readVisitSummary',
        data: { visitId, restaurantId, tableId },
      });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }

  /** Every meal this account keeps, newest first. Members only. */
  async list(): Promise<ListVisitSummariesResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        Record<string, never>,
        ListVisitSummariesResult
      >({ name: 'listVisitSummaries', data: {} });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }

  /**
   * Sends one summary to one address, once.
   *
   * The address is an argument and nothing else: it is handed to the backend,
   * used for the send, and stored nowhere - not here, not on the account, not
   * on the summary (`RD-TS-46`). Nothing in this client keeps it either, which
   * is why the field is cleared the moment the call is made.
   */
  async email(
    visitId: string,
    email: string,
  ): Promise<EmailVisitSummaryResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        { visitId: string; email: string },
        EmailVisitSummaryResult
      >({ name: 'emailVisitSummary', data: { visitId, email } });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }
}
