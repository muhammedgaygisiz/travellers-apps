import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';

export const ROUTES: Routes = withAuthRoutes([
  {
    path: 'start',
    loadComponent: () =>
      import('bite-tribe/start').then((m) => m.BiteTribeStartComponent),
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
