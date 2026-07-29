import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

export interface DeleteOwnAccountResult {
  status: 'running' | 'completed' | 'failed';
}

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  /**
   * Runs the backend account-deletion cascade for the signed-in user.
   *
   * Errors are deliberately not swallowed here: the caller distinguishes a
   * stale sign-in (`reauth_required`) from a real failure and reacts
   * differently to each.
   */
  async deleteOwnAccount(): Promise<DeleteOwnAccountResult> {
    const result = await FirebaseFunctions.callByName<
      void,
      DeleteOwnAccountResult
    >({
      name: 'deleteOwnAccount',
    });

    return result.data;
  }
}
