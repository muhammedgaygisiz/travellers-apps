import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard } from 'ta-firestore';

export const ROUTES: Routes = withAuthRoutes([
  {
    path: 'start',
    loadComponent: () =>
      import('bite-tribe/start').then((m) => m.BiteTribeStartComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.HomeContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: 'new-bite',
    loadComponent: () =>
      import('bite-tribe/bite').then((m) => m.BiteContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: `bite/:biteId`,
    loadComponent: () =>
      import('bite-tribe/details').then((m) => m.DetailsContainer),
    canActivate: [authGuard],
  },
  {
    path: 'bite/:biteId/restaurant/:restaurantId',
    loadComponent: () =>
      import('bite-tribe/restaurant').then((m) => m.RestaurantContainer),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('bite-tribe/settings').then((m) => m.SettingsContainer),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
