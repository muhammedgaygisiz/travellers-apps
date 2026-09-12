import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { AuthService } from 'ta-firestore';
import { staffRestaurantIdOf } from './restaurant-staff-association';

/**
 * Sends a staff account to the room it works in instead of the owner's
 * dashboard (GitHub issue #1097).
 *
 * The dashboard lists restaurants by `Restaurant.ownerUserId`, which a staff
 * account never holds, so a waiter signing in has so far landed on a page
 * showing an empty map and two sections that lead to two more empty lists.
 * Everything the role may actually do lives at
 * `restaurant/:restaurantId/tables`, and until now nothing linked there: the
 * one surface the role has was reachable only by typing its URL.
 *
 * **A guard rather than a second `AFTER_LOGIN_PAGE`.** The token is one string
 * for the whole app and the answer depends on the account, so a token cannot
 * carry it. A guard also covers the two ways into this page that are not a
 * sign-in — a restored session and a bookmark — which is where a redirect
 * written into the login effect would have left the same empty dashboard.
 *
 * **It is not a gate and refuses nothing.** `roleGuard` on the same route
 * decides who may be here at all; this only decides where "here" is worth
 * being for one kind of account. So every uncertain answer falls through to
 * the dashboard rather than to a refusal: an owner has no association and is
 * left alone, and a staff account whose association cannot be read gets the
 * page it used to get instead of a redirect loop or an error.
 *
 * `business` and `staff` are mutually exclusive in `setUserRoles`, and
 * `addRestaurantStaff` refuses an account holding either privileged role, so
 * an association is enough on its own to know this is not an owner. The role
 * is not re-checked here for that reason, and because `roleGuard` has already
 * established it.
 *
 * It waits for auth restoration itself rather than trusting `authGuard` to
 * have done it, because Angular activates a route's guards concurrently rather
 * than in sequence — see the Cold Start Rules in `Architecture - Auth`.
 */
export const staffEntryGuard =
  (): CanActivateFn => async (): Promise<GuardResult> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.whenAuthStateRestored();

    const uid = authService.getUser()?.uid;

    if (!uid) {
      return true;
    }

    const restaurantId = await staffRestaurantIdOf(uid);

    if (!restaurantId) {
      return true;
    }

    return router.parseUrl(`/restaurant/${restaurantId}/tables`);
  };
