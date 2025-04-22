import { Routes } from '@angular/router';
import { Page } from 'pages';
import { withAuthRoutes } from 'auth';
import { authGuard } from 'ta-firestore';

export const ROUTES: Routes = withAuthRoutes([
  {
    path: Page.DASHBOARD,
    loadComponent: () =>
      import('finances/pages/dashboard').then(
        (m) => m.DashboardContainerComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: Page.ADD_BANK,
    loadComponent: () =>
      import('finances/pages/add-bank').then(
        (m) => m.AddBankContainerComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: `${Page.ACCOUNT}/:iban`,
    loadComponent: () =>
      import('finances/pages/account').then((m) => m.AccountContainerComponent),
  },
  {
    path: `:iban/${Page.PAYMENT}`,
    loadComponent: () =>
      import('finances/pages/payment').then(
        (m) => m.AddPaymentContainerComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: `:iban/${Page.PAYMENT}/:paymentId`,
    loadComponent: () =>
      import('finances/pages/payment').then(
        (m) => m.EditPaymentContainerComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
]);
