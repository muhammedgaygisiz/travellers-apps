import { Routes } from '@angular/router';
import { Page } from 'pages';

export const ROUTES: Routes = [
  {
    path: Page.DASHBOARD,
    loadComponent: () =>
      import('finances/pages/dashboard').then(
        (m) => m.DashboardContainerComponent
      ),
  },
  {
    path: Page.ADD_BANK,
    loadComponent: () =>
      import('finances/pages/add-bank').then(
        (m) => m.AddBankContainerComponent
      ),
  },
  {
    path: Page.ACCOUNT,
    loadComponent: () =>
      import('finances/pages/account').then((m) => m.AccountContainerComponent),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
