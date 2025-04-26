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
      import('bite-tribe/home').then((m) => m.BiteTribeHomeComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
