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
    path: 'dashboard',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then((m) => m.DashboardContainer),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
