import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, documentOwnerGuard, roleGuard } from 'ta-firestore';

/**
 * The second half of the ownership boundary, and the half a link cannot dodge.
 *
 * The dashboard lists only the restaurants assigned to the account, so a
 * restaurant it does not hold is already unreachable by clicking. That is not
 * the same as being refused: the id is in the URL, links get shared, and a
 * revocation leaves an account with a bookmark to a page it may no longer
 * open. So every route that edits a restaurant - the restaurant itself, its
 * menu, its staff and its floor plan - checks the assignment rather than
 * trusting the list that led here (issue #1079).
 *
 * The menu route is checked against its `restaurantId` too. A menu document
 * carries no owner; the restaurant does, and it is the restaurant's `menuId`
 * that says which menu belongs to it, which is the same shape issue #1078's
 * rules use for a menu write.
 */
const ownedRestaurantGuard = documentOwnerGuard({
  collection: 'restaurants',
  paramName: 'restaurantId',
  ownerField: 'ownerUserId',
  refusalMessageKey: 'restaurant-not-assigned-to-account',
  redirectTo: '/restaurants',
});

/**
 * Every authenticated route carries the same two guards, and the ones that
 * edit one restaurant carry `ownedRestaurantGuard` on top.
 *
 * `authGuard` establishes that someone is signed in;
 * `roleGuard('business', 'staff')` establishes that the account was granted
 * business access by an operator, or was put on a restaurant as staff. The two
 * are alternatives, not a hierarchy: a staff account holds `staff` and *not*
 * `business`, so naming only `business` here would sign it out at the door
 * (issue #1075). What a staff account may then *do* is narrower: issue #1078's
 * rules decide what it may write, and `ownedRestaurantGuard` above decides
 * which restaurant it may open at all.
 *
 * Until issue #1469 only the first existed, which meant any BiteTribe account
 * could open this app and run the operational migrations in it. Those
 * migrations, restaurant-candidate verification and the unmatched Bite places
 * left for the admin app with issue #1473, so what is behind this gate is now
 * only what a restaurant does to its own data.
 *
 * The gate is hard and there is no backfill: an account that could sign in
 * before the role existed cannot sign in now unless it has been granted the
 * role through the admin app. That is the intended behaviour, not an
 * oversight - see the rollout decision on the issue.
 *
 * `start` and the auth routes stay ungated: they are where a visitor who fails
 * those checks is sent.
 *
 * Sign-in itself refuses an account without the role, so these guards are the
 * backstop for a restored session or a revoked role rather than the primary
 * gate. A rejected account is signed out and returned to the login page with a
 * generic failure — never told which role it lacks.
 */
export const ROUTES: Routes = withAuthRoutes([
  {
    path: 'start',
    loadComponent: () =>
      import('bite-tribe-business/start').then((m) => m.Start),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then((m) => m.DashboardContainer),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'bite-trails',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then(
        (m) => m.BiteTrailsContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'restaurants',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then(
        (m) => m.RestaurantsContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'create-bite-trail',
    loadComponent: () =>
      import('bite-tribe-business/create-bite-trail').then(
        (m) => m.CreateBiteTrailContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'restaurant/:restaurantId',
    loadComponent: () =>
      import('bite-tribe-business/restaurant').then(
        (m) => m.EditRestaurantContainer,
      ),
    canActivate: [
      authGuard,
      roleGuard('business', 'staff'),
      ownedRestaurantGuard,
    ],
  },
  /**
   * Managing staff is the **owner's** route, not the restaurant's.
   *
   * `ownedRestaurantGuard` checks `Restaurant.ownerUserId`, which a staff
   * account never holds, so a staff account cannot reach the page that would
   * let it add more staff — and the callables behind it refuse the same
   * account for the same reason (issue #1537). The guard is what makes that
   * true of a shared or bookmarked URL as well as of the links.
   */
  {
    path: 'restaurant/:restaurantId/staff',
    loadComponent: () =>
      import('bite-tribe-business/staff').then(
        (m) => m.RestaurantStaffContainer,
      ),
    canActivate: [
      authGuard,
      roleGuard('business', 'staff'),
      ownedRestaurantGuard,
    ],
  },
  /**
   * The floor plan is the **owner's** route too.
   *
   * [[Floor Plan]] gives staff a read of the *published* plan and no write, and
   * this route is neither: it is the editor, which writes a draft as the owner
   * arranges and publishes it when they say so. Issue #1088 opened the staff
   * read in `firestore.rules` once there was a published state to open it to,
   * and deliberately left this gate alone - the surface staff get is the live
   * view of issue #1093, not the editor at a different permission.
   * `ownedRestaurantGuard` checks `Restaurant.ownerUserId`, which a staff
   * account never holds, and the rules refuse a draft write from the same
   * account for the same reason (issue #1082).
   */
  {
    path: 'restaurant/:restaurantId/floor-plan',
    loadComponent: () =>
      import('bite-tribe-business/floor-plan').then(
        (m) => m.FloorPlanContainer,
      ),
    canActivate: [
      authGuard,
      roleGuard('business', 'staff'),
      ownedRestaurantGuard,
    ],
  },
  /**
   * The printable table codes, under the floor plan and behind the same gate
   * (issue #1087).
   *
   * A route of its own rather than a dialog inside the editor, for two
   * reasons. A print stylesheet can strip the app's chrome off a page it owns
   * and cannot reliably do it through an overlay's stacking and scroll
   * container. And a sticker that was scraped off table 12 is reprinted months
   * after the plan was last edited, by an owner who wants the sheet rather
   * than the editor — so it is a place that can be bookmarked and returned to.
   */
  {
    path: 'restaurant/:restaurantId/floor-plan/qr-codes',
    loadComponent: () =>
      import('bite-tribe-business/floor-plan').then(
        (m) => m.TableQrSheetsContainer,
      ),
    canActivate: [
      authGuard,
      roleGuard('business', 'staff'),
      ownedRestaurantGuard,
    ],
  },
  {
    path: 'restaurant/:restaurantId/menu/:menuId',
    loadComponent: () =>
      import('bite-tribe-business/edit-menu').then((m) => m.EditMenuContainer),
    canActivate: [
      authGuard,
      roleGuard('business', 'staff'),
      ownedRestaurantGuard,
    ],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
