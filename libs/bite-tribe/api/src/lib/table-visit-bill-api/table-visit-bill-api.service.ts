import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { ReadTableVisitBillResult } from 'model';
import {
  type TableSessionCallError,
  tableSessionCallFailed,
} from '../table-session-api/table-session-api.service';

/**
 * What the table owes, fetched rather than watched (GitHub issue #1110).
 *
 * ## One call, and deliberately no listener
 *
 * Every other table surface on the guest's phone is a Firestore listener,
 * because the thing it shows changes on somebody else's device: an order moves
 * through the kitchen, a waiter acknowledges a signal, staff close the table.
 * The bill is the exception, and for two reasons.
 *
 * It **cannot** be a listener: `RD-TS-12` keeps the visit and the party's
 * orders unlistable from a guest's phone, which is the whole reason
 * `readTableVisitBill` exists. There is no document to subscribe to.
 *
 * And it does not want to be. A bill is read at one moment - when somebody
 * asks what the table owes - and the guest's own orders, which *are* watched
 * (issue #1104), already tell them when something they sent has changed. A
 * poll behind a bill would keep a phone awake through a meal to re-fetch a
 * figure nobody is looking at.
 *
 * So the screen fetches, and offers a refresh. What it must not do is cache
 * across a session: the party orders again while the bill is on screen, and a
 * stale total is worse than a spinner.
 *
 * ## Why a refusal comes back as a value
 *
 * The same reason it does on the scan, the order and the assistance request. A
 * guest whose table was cleared while their phone was in their pocket has not
 * hit an error. Only the transport failing rejects, and
 * `tableSessionCallFailed` turns that into the three sentences the other table
 * screens already use.
 */
@Injectable({ providedIn: 'root' })
export class TableVisitBillApiService {
  /**
   * Reads what the party owes.
   *
   * No sign-in here, following `TableOrderApiService.submit`: the bill is read
   * from a session, and signing an unknown guest in at this point would mint a
   * fresh anonymous account with no session on it and produce a
   * `sessionNotFound` a moment later.
   */
  async read(
    restaurantId: string,
    tableId: string,
  ): Promise<ReadTableVisitBillResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        { restaurantId: string; tableId: string },
        ReadTableVisitBillResult
      >({
        name: 'readTableVisitBill',
        data: { restaurantId, tableId },
      });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }
}
