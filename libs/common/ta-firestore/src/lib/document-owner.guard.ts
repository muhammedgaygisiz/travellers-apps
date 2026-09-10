import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ToastService } from 'toast';
import { AuthService } from './auth.service';

export interface DocumentOwnerGuardOptions {
  /** Firestore collection holding the document the route is about. */
  collection: string;
  /** Route parameter carrying the document id. */
  paramName: string;
  /** Field on the document naming the account that holds it. */
  ownerField: string;
  /** Transloco key for the refusal the visitor is shown. */
  refusalMessageKey: string;
  /** Where a refused visitor is sent instead. */
  redirectTo: string;
}

/**
 * Admits only the account named on the document the route addresses.
 *
 * `roleGuard` answers "is this account's app"; this one answers "is this
 * account's *document*". The business app needs both: every restaurant holds
 * `business`, so the role alone opens the edit form of every restaurant in
 * BiteTribe, which is what issue #1079 closes.
 *
 * It refuses **by direct URL**, not merely by being unlinked. Scoping the list
 * that leads here hides the route; only a guard removes it, and a guard is
 * what a shared or bookmarked link meets.
 *
 * The refusal is a toast and a redirect rather than an error screen: the
 * visitor is a legitimate business account that asked for the wrong
 * restaurant, so it lands back on its own list with a sentence saying why.
 * Which restaurant, and who does hold it, is deliberately not said - that
 * would answer a question the caller has no standing to ask.
 *
 * **A read that fails is a refusal.** The rules let any signed-in account read
 * any restaurant, so a rejected or empty read means offline, a deleted
 * document, or a rule that has since narrowed - never "and therefore it is
 * yours". Guards fail closed.
 *
 * It waits for auth restoration itself rather than trusting `authGuard` to
 * have done it: Angular activates a route's guards concurrently rather than in
 * sequence (see the Cold Start Rules in `Architecture - Auth`).
 */
export const documentOwnerGuard =
  ({
    collection,
    paramName,
    ownerField,
    refusalMessageKey,
    redirectTo,
  }: DocumentOwnerGuardOptions): CanActivateFn =>
  async (route): Promise<GuardResult> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    await authService.whenAuthStateRestored();

    const uid = authService.getUser()?.uid;
    const documentId = route.paramMap.get(paramName);

    // No session is `authGuard`'s answer to give, and it is on the same route.
    // Redirecting without a toast keeps the two from talking over each other.
    if (!uid) {
      return router.parseUrl(redirectTo);
    }

    const holdsDocument = async (): Promise<boolean> => {
      if (!documentId) {
        return false;
      }

      try {
        const { snapshot } = await FirebaseFirestore.getDocument({
          reference: `${collection}/${documentId}`,
        });

        return snapshot?.data?.[ownerField] === uid;
      } catch {
        return false;
      }
    };

    if (await holdsDocument()) {
      return true;
    }

    await toast.present({
      messageKey: refusalMessageKey,
      outcome: 'failure',
    });

    return router.parseUrl(redirectTo);
  };
