import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { AuthService } from 'ta-firestore';
import { ToastService } from 'toast';
import {
  holdsRestaurant,
  staffRestaurantIdOf,
} from './restaurant-staff-association';

/**
 * Admits the account that **holds** this restaurant, or one that **works at**
 * it (GitHub issue #1093).
 *
 * `ownedRestaurantGuard` is the same question with half the answer: it checks
 * `Restaurant.ownerUserId`, which a staff account never holds, so it is the
 * right gate for the editor, the menu and the staff list and the wrong one for
 * the surface staff open at the start of a shift. The live view is the first
 * route in this app that a non-owner is supposed to reach, and a guard that
 * only knows about owners would have made it unreachable by exactly the people
 * it is for.
 *
 * The two reads mirror the two halves of `worksAt()` in `firestore.rules`: the
 * restaurant document names its owner, and `/restaurantStaff/{uid}` names the
 * one restaurant an account works at. The staff read is by the caller's own
 * uid, which is the only read of that collection the rules allow an ordinary
 * account, so this is one `get` rather than a query.
 *
 * **Refusing is not the security boundary**, and must not be mistaken for one.
 * The rules decide what the account may actually read; this decides what it is
 * shown, so a shared or bookmarked link lands on a sentence rather than on a
 * page of permission errors. It is checked by direct URL for the same reason
 * `documentOwnerGuard` is: scoping the list that leads here only hides the
 * route.
 *
 * **A read that fails is a refusal.** Offline, a deleted restaurant or a rule
 * that has since narrowed all read the same from here, and none of them mean
 * "and therefore it is yours". Guards fail closed.
 *
 * It waits for auth restoration itself rather than trusting `authGuard` to have
 * done it, because Angular activates a route's guards concurrently rather than
 * in sequence - see the Cold Start Rules in `Architecture - Auth`.
 */
export const restaurantAccessGuard =
  (redirectTo: string): CanActivateFn =>
  async (route): Promise<GuardResult> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    await authService.whenAuthStateRestored();

    const uid = authService.getUser()?.uid;
    const restaurantId = route.paramMap.get('restaurantId');

    // No session is `authGuard`'s answer to give, and it is on the same route.
    // Redirecting without a toast keeps the two from talking over each other.
    if (!uid) {
      return router.parseUrl(redirectTo);
    }

    if (restaurantId) {
      if (await holdsRestaurant(uid, restaurantId)) {
        return true;
      }

      if ((await staffRestaurantIdOf(uid)) === restaurantId) {
        return true;
      }
    }

    await toast.present({
      messageKey: 'restaurant-not-assigned-to-account',
      outcome: 'failure',
    });

    return router.parseUrl(redirectTo);
  };
