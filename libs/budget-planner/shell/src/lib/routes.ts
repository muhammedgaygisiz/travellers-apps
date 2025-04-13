import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import {
  //   AuthGuard,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';

const redirectUnauthorizedToHome = () => redirectUnauthorizedTo(['start']);

export const ROUTES: Routes = withAuthRoutes([
  {
    path: 'start',
    loadComponent: () => import('start').then((m) => m.StartComponent),
    //    canActivate: [AuthGuard],
    data: {
      authGuardPipe: redirectUnauthorizedToHome,
    },
  },
  {
    path: 'new-trip',
    loadComponent: () => import('new-trip').then((m) => m.NewTripComponent),
  },
  {
    path: 'add-expenses',
    loadComponent: () =>
      import('add-expenses').then((m) => m.AddExpensesComponent),
  },
  {
    path: 'trip-dashboard',
    loadComponent: () =>
      import('trip-dashboard').then((m) => m.TripDashboardComponent),
  },

  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
