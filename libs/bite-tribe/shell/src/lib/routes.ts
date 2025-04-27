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
      import('bite-tribe/bite').then((m) => m.BiteTribeBiteComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
