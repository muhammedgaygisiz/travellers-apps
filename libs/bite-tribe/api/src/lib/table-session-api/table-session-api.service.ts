import { Injectable, inject } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { AuthService } from 'ta-firestore';
import type {
  LeaveTableSessionRequest,
  ResolveTableQrTokenRequest,
  StartTableSessionRequest,
  StartTableSessionResult,
  TableScanResult,
  TableSessionStatus,
} from 'model';

/**
 * What a guest's phone can ask about the table it has just scanned
 * (GitHub issue #1101).
 *
 * ## Three callables and no Firestore read
 *
 * Everything a scan establishes lives in documents a guest may not read - the
 * restaurant, the published table, the menu - so there is no client-side query
 * here to write. `resolveTableQrToken` answers what the code points at,
 * `startTableSession` attaches the guest to the party, and `leaveTableSession`
 * detaches them. The one thing the guest *can* read directly is their own
 * session document, and that is a realtime subscription rather than a call.
 *
 * ## Why a refusal comes back as a value
 *
 * `TableScanResult` is a union with an `ok` discriminant, and every one of the
 * twelve refusals arrives as a resolved promise. A guest standing at a table of
 * a restaurant that closed an hour ago has not hit an error; they have been
 * told it is shut. The `catch` blocks below are for the transport failing -
 * flight mode, App Check, a cold function - which is a different sentence and
 * the only one a screen should apologise for.
 */

/** What went wrong in the transport, as opposed to what a scan resolved to. */
export type TableSessionCallFailure = 'offline' | 'rateLimited' | 'unknown';

export interface TableSessionCallError {
  ok: false;
  failure: TableSessionCallFailure;
}

/**
 * The transport failure behind a rejected callable.
 *
 * Three outcomes rather than one, because they call for three different things
 * from the guest: wait a moment, check the signal, or ask staff. `unavailable`
 * is what the Firebase SDK reports for a request that never left the phone, and
 * `resource-exhausted` is the scan rate limiter of issue #1100 saying the same
 * code has been hammered - which a guest triggers by tapping a retry button
 * repeatedly and should be told to stop doing.
 */
const failureOf = (error: unknown): TableSessionCallFailure => {
  const code = String((error as { code?: string })?.code ?? '');

  if (code.includes('unavailable') || code.includes('deadline')) {
    return 'offline';
  }

  return code.includes('resource-exhausted') ? 'rateLimited' : 'unknown';
};

const failed = (error: unknown): TableSessionCallError => ({
  ok: false,
  failure: failureOf(error),
});

/** Whether a call failed in transport rather than resolving to an answer. */
export const isTableSessionCallError = (
  result: unknown,
): result is TableSessionCallError =>
  typeof result === 'object' &&
  result !== null &&
  'failure' in result &&
  (result as { ok?: unknown }).ok === false;

@Injectable({ providedIn: 'root' })
export class TableSessionApiService {
  private readonly authService = inject(AuthService);

  /**
   * What the scanned code points at, or why it points at nothing usable.
   *
   * Reachable with no session at all, which is the point: the scan is what
   * establishes which restaurant the guest would be signing in to, so asking
   * them to sign in first would make the account a precondition of finding out
   * whether the restaurant even takes orders at the table.
   */
  async resolveToken(
    token: string,
  ): Promise<TableScanResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        ResolveTableQrTokenRequest,
        TableScanResult
      >({ name: 'resolveTableQrToken', data: { token } });

      return result.data;
    } catch (error) {
      return failed(error);
    }
  }

  /**
   * Attaches the guest to the party at the table, signing them in first if
   * nobody is.
   *
   * The sign-in is here rather than on the screen because it is a precondition
   * of the call and not a step the guest takes: a session has to belong to
   * somebody, and the guest never asked for an account. A member who scans is
   * left signed in as themselves.
   *
   * The scan is re-run by the backend, so what comes back is a fresh answer
   * rather than the one the confirmation screen was drawn from - the kitchen
   * can pause while the guest reads it.
   */
  async start(
    token: string,
  ): Promise<StartTableSessionResult | TableSessionCallError> {
    try {
      await this.authService.signInAsGuest();

      const result = await FirebaseFunctions.callByName<
        StartTableSessionRequest,
        StartTableSessionResult
      >({ name: 'startTableSession', data: { token } });

      return result.data;
    } catch (error) {
      return failed(error);
    }
  }

  /**
   * Ends this guest's session and nobody else's.
   *
   * Answers the status the session ended at, so a guest who taps leave on a
   * table the restaurant closed a minute earlier is told that rather than being
   * told they left.
   */
  async leave(
    restaurantId: string,
    tableId: string,
  ): Promise<TableSessionStatus | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        LeaveTableSessionRequest,
        { status: TableSessionStatus }
      >({
        name: 'leaveTableSession',
        data: { restaurantId, tableId },
      });

      return result.data.status;
    } catch (error) {
      return failed(error);
    }
  }
}
