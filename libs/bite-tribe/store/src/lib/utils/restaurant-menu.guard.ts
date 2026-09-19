import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AuthService } from 'ta-firestore';
import { PATH, PUBLIC_MENU_RESTAURANT_PARAM } from 'utils';
import type { Restaurant } from 'model';

/**
 * The menu document a restaurant points at, as an id rather than a path.
 *
 * `Restaurant.menuId` has held both shapes over the collection's life - a bare
 * document id, and a `menus/{id}` path - so every reader that has to open the
 * document normalises it. The consumer restaurant page has done so since it
 * gained the menu button; this is the same rule, in one place both guards
 * below can reach.
 */
export const menuIdOfRestaurant = (
  restaurant: Restaurant | undefined,
): string | undefined =>
  restaurant?.menuId?.split('/').filter(Boolean).pop() || undefined;

/**
 * Where a signed-in member reads a restaurant's menu (GitHub issue #370).
 *
 * The app's other menu route hangs off a Bite -
 * `bite/:biteId/restaurant/:restaurantId/menu/:menuId` - because until now a
 * menu was only ever reached by following one. A scanned menu code carries a
 * restaurant and nothing else, so this resolves the rest: it reads the
 * restaurant, takes its menu, and hands the navigation on to the page that
 * renders one.
 *
 * A redirect rather than a resolver, so the address that ends up in history is
 * the one the menu page is keyed on. The NgRx menu pipeline loads from the
 * route's own `menuId` parameter, and a route that resolved the id without
 * putting it in the URL would render a page with nothing to read.
 */
export const restaurantMenuGuard: CanActivateFn = async (
  route,
): Promise<GuardResult> => {
  const api = inject(BiteTribeApiService);
  const router = inject(Router);

  const restaurantId = route.paramMap.get('restaurantId') ?? '';

  if (!restaurantId) {
    return router.parseUrl(`/${PATH.HOME}`);
  }

  const restaurant = await api.loadRestaurant(restaurantId);
  const menuId = menuIdOfRestaurant(restaurant);

  if (!menuId) {
    // Nothing to render, and the public page is the one surface that already
    // says why in eleven languages - `restaurantNotFound` and `menuMissing`
    // are two of its four refusals. Its own guard allows it through rather
    // than sending the member back here, because that branch asks for a menu
    // and there is none: the two cannot bounce off each other.
    return router.parseUrl(`/${PATH.PUBLIC_MENU}/${restaurantId}`);
  }

  return router.parseUrl(
    `/${PATH.RESTAURANT}/${restaurantId}/${PATH.MENU}/${menuId}`,
  );
};

/**
 * Hands a scanned menu code to the app's own menu page when a member scans it
 * (GitHub issue #370).
 *
 * The printed code carries `bitetribe.app/m/{restaurantId}`, one address for
 * everybody who points a camera at it. A stranger gets the public page, which
 * is what the address exists for. Somebody who already has BiteTribe, and is
 * signed in to it, should not be handed the stripped-down page instead of the
 * one their own app has - with the chrome, and the button that turns a dish
 * into a Bite.
 *
 * It asks for a **member**, the same question `authGuard` asks. A guest
 * holding an anonymous table session is not one: the in-app menu route carries
 * `authGuard`, which refuses that session, so redirecting them there would
 * bounce them to `/start` - a sign-in wall in front of a restaurant's menu,
 * which is the exact thing this route exists to remove.
 *
 * The menu is resolved here rather than after the redirect, so a restaurant
 * that has published a code but no menu falls through to the public page's own
 * refusal instead of being sent to a route that would send it back.
 *
 * ## A member who has not finished onboarding
 *
 * They are sent through the assistant first, because the route this redirects
 * to carries `authGuard` and therefore the onboarding gate with it. That is a
 * deferral rather than a dead end - `onboardingGuard` remembers the displaced
 * URL (issue #1246), so the menu is what they land on when the assistant is
 * done.
 *
 * Asking the question here instead, and leaving such a member on the public
 * page, would mean a second reader of the onboarding rule - including its
 * session-scoped dismissal - in a library that cannot import the first. Two
 * readers of one rule is how they start disagreeing.
 */
export const publicMenuMemberGuard: CanActivateFn = async (
  route,
): Promise<GuardResult> => {
  const auth = inject(AuthService);
  const api = inject(BiteTribeApiService);
  const router = inject(Router);

  const restaurantId = route.paramMap.get(PUBLIC_MENU_RESTAURANT_PARAM) ?? '';

  if (!restaurantId) {
    return true;
  }

  if (!auth.getMember()) {
    // A cold start straight onto a scanned code runs this before the persisted
    // session has been read out of IndexedDB, which is the case `authGuard`
    // waits on for the same reason (issue #1246). Without the wait, a member
    // who scans is shown the stranger's page.
    await auth.whenAuthStateRestored();

    if (!auth.getMember()) {
      return true;
    }
  }

  const menuId = menuIdOfRestaurant(await api.loadRestaurant(restaurantId));

  if (!menuId) {
    return true;
  }

  return router.parseUrl(
    `/${PATH.RESTAURANT}/${restaurantId}/${PATH.MENU}/${menuId}`,
  );
};
