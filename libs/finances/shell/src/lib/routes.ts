import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('finances/pages/dashboard').then(
        (m) => m.DashboardContainerComponent,
      ),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
