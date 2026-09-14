import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetDocumentResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { AuthService } from 'ta-firestore';
import { TABLE_SESSIONS_COLLECTION, tableSessionId } from 'model';
import type {
  LeaveTableSessionRequest,
  ResolveTableQrTokenRequest,
  ScanPosition,
  StartTableSessionRequest,
  StartTableSessionResult,
  TableScanResult,
  TableSession,
  TableSessionStatus,
} from 'model';
import { map, type Observable } from 'rxjs';
import { RESTAURANT_COLLECTION } from '../utils/constants';
import {
  snapshotListener,
  type SnapshotDelivery,
} from '../utils/snapshot-listener';

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

/**
 * A rejected callable, as the value a screen renders.
 *
 * Exported because the table order of issue #1103 fails in exactly these three
 * ways and is rendered by the same three sentences. A second copy would be a
 * second place for "the phone never got through" to drift from "we could not
 * reach the restaurant".
 */
export const tableSessionCallFailed = (
  error: unknown,
): TableSessionCallError => ({
  ok: false,
  failure: failureOf(error),
});

const failed = tableSessionCallFailed;

/** Whether a call failed in transport rather than resolving to an answer. */
export const isTableSessionCallError = (
  result: unknown,
): result is TableSessionCallError =>
  typeof result === 'object' &&
  result !== null &&
  'failure' in result &&
  (result as { ok?: unknown }).ok === false;

/** A guest's own session as their phone reads it, with the listener's health. */
export interface LiveTableSession {
  /** The session, or nothing where this guest has none at this table. */
  session?: TableSession;
  /** Whether the listener is still delivering. See `SnapshotDelivery`. */
  live: boolean;
}

@Injectable({ providedIn: 'root' })
export class TableSessionApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

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
    position?: ScanPosition,
  ): Promise<StartTableSessionResult | TableSessionCallError> {
    try {
      await this.authService.signInAsGuest();

      const result = await FirebaseFunctions.callByName<
        StartTableSessionRequest,
        StartTableSessionResult
      >({
        name: 'startTableSession',
        // Omitted rather than sent as `undefined`, so a guest who shared
        // nothing and a guest whose fix failed are one request on the wire and
        // not two (issue #1107).
        data: position ? { token, position } : { token },
      });

      return result.data;
    } catch (error) {
      return failed(error);
    }
  }

  /**
   * This guest's own session at one table, again on every change
   * (GitHub issue #1104).
   *
   * The one document a guest may read directly, and the only live answer their
   * phone has to two questions the ordering screen asks constantly: which visit
   * their orders belong to, and whether the table is still taking them. Staff
   * close a visit and every session under it closes in the same commit, so a
   * guest whose table was cleared is told by the document rather than by an
   * order coming back refused after they built a second cart.
   *
   * A listener rather than a poll, and a document rather than a callable, for
   * the reason the staff floor plan is one: what has to arrive within seconds is
   * a change somebody else made, and a listener is the server pushing it.
   *
   * No query and no id from anywhere. `tableSessionId` derives the document name
   * from the table and the uid, which is what a derived name is for - the phone
   * that started the session can subscribe to it after a reload, holding nothing
   * but the token it scanned and the account it signed into.
   *
   * The session may be absent, and that is an ordinary outcome rather than a
   * failure: a guest who reached the ordering screen by a link they kept never
   * started one. The screen reads absence as "unknown" and lets the backend
   * refuse the order, which is a better sentence than one invented here.
   */
  session$(
    restaurantId: string,
    tableId: string,
    guestUserId: string,
  ): Observable<LiveTableSession> {
    const reference = `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLE_SESSIONS_COLLECTION}/${tableSessionId(tableId, guestUserId)}`;

    return snapshotListener<GetDocumentResult<DocumentData>>(
      (callback) =>
        FirebaseFirestore.addDocumentSnapshotListener({ reference }, callback),
      (error) => this.errorHandler.handleError(error),
    ).pipe(map(toLiveSession));
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

/**
 * One delivery, as the session it describes.
 *
 * The document id is not read back off the snapshot: `TableSession.id` is the
 * derived name and is already on the stored document, so taking it from the
 * path would be a second source for one field, free to disagree with the first
 * on a document written before the derivation existed.
 */
const toLiveSession = (
  delivery: SnapshotDelivery<GetDocumentResult<DocumentData>>,
): LiveTableSession => {
  const data = delivery.event?.snapshot?.data;

  return {
    ...(data ? { session: data as TableSession } : {}),
    live: delivery.live,
  };
};
