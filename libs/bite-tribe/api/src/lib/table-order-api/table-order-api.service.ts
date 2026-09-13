import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { SubmitTableOrderRequest, SubmitTableOrderResult } from 'model';
import {
  type TableSessionCallError,
  tableSessionCallFailed,
} from '../table-session-api/table-session-api.service';

/**
 * The one call a guest's cart makes (GitHub issue #1103).
 *
 * ## Why a refusal comes back as a value
 *
 * The same reason it does on the scan. A guest whose Margherita sold out while
 * they were reading the dessert list has not hit an error; they have been told
 * the kitchen is out of Margheritas, and there is a specific thing for them to
 * do about it. So the twelve refusals arrive as a resolved promise and only the
 * transport failing rejects - flight mode, App Check, a cold function - which
 * is a different sentence and the only one a screen should apologise for.
 *
 * ## No sign-in here
 *
 * Unlike `TableSessionApiService.start`, which signs the guest in because a
 * session has to belong to somebody, this one assumes a session already exists:
 * an order is placed from one, and a guest with no session has nothing to order
 * into. Signing somebody in at this point would produce a fresh anonymous
 * account with no session on it, and the order would be refused as
 * `sessionNotFound` a moment later - a sign-in that achieves a worse error.
 */
@Injectable({ providedIn: 'root' })
export class TableOrderApiService {
  /**
   * Sends the cart, and answers what the restaurant made of it.
   *
   * Every price in `request` is what the phone displayed, and the backend
   * compares each one to the live menu. That is not a formality the client can
   * skip by sending the menu's number: it is how "the prices on the order are
   * the prices the guest saw" is kept true across a menu edited mid-meal.
   */
  async submit(
    request: SubmitTableOrderRequest,
  ): Promise<SubmitTableOrderResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        SubmitTableOrderRequest,
        SubmitTableOrderResult
      >({ name: 'submitTableOrder', data: request });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }
}
