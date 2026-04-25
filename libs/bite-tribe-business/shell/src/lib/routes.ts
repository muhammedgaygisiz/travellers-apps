import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard } from 'ta-firestore';

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
    canActivate: [authGuard],
  },
  {
    path: 'migrations',
    loadComponent: () =>
      import('bite-tribe-business/migrations').then(
        (m) => m.MigrationsContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: ':organisationId/dashboard',
    loadComponent: () =>
      import('bite-tribe-business/organisation-dashboard').then(
        (m) => m.OrganisationDashboardContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: ':organisationId/create-bite-trail',
    loadComponent: () =>
      import('bite-tribe-business/create-bite-trail').then(
        (m) => m.CreateBiteTrailContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'new-restaurant',
    loadComponent: () =>
      import('bite-tribe-business/restaurant').then(
        (m) => m.NewRestaurantContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'restaurant/:restaurantId',
    loadComponent: () =>
      import('bite-tribe-business/restaurant').then((m) => m.EditRestaurantContainer),
    canActivate: [authGuard],
  },
  {
    path: 'restaurant/:restaurantId/menu/:menuId',
    loadComponent: () =>
      import('bite-tribe/menu').then((m) => m.MenuEditContainer),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
