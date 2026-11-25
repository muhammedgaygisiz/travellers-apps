import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, startGuard } from 'ta-firestore';
import { PATH } from 'utils';

/**
 * The Bite Creator app: where a BiteTribe account makes its BiteTrails
 * (issue #2130).
 *
 * Every authenticated route carries `authGuard` and nothing else. Creating a
 * BiteTrail needs no role (`RD-UR-4`), and `firestore.rules` admits any
 * signed-in account that names itself as the trail's owner, so the app and the
 * rules admit the same accounts. A creator role is planned; when it lands it
 * is a `roleGuard` here and a `REQUIRED_ROLES` binding in the shell providers,
 * the way the business and admin apps gate theirs.
 *
 * `start` and the auth routes stay ungated: they are where a signed-out
 * visitor is sent. `start` carries `startGuard`, which sends a signed-in
 * account on to its BiteTrails. Registration stays, because a creator account
 * is self-served like a consumer one.
 */
export const ROUTES: Routes = withAuthRoutes([
  {
    path: PATH.START,
    loadComponent: () =>
      import('bite-tribe-creator/start').then((m) => m.CreatorStart),
    canActivate: [startGuard],
  },
  {
    path: 'bite-trails',
    title: 'BiteTrails',
    loadComponent: () =>
      import('bite-tribe-creator/bite-trails').then(
        (m) => m.BiteTrailsContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'create-bite-trail',
    title: 'New BiteTrail',
    loadComponent: () =>
      import('bite-tribe-creator/create-bite-trail').then(
        (m) => m.CreateBiteTrailContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'bite-trails',
    pathMatch: 'full',
  },
]);
