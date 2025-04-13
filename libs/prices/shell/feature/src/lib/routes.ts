import { Routes } from '@angular/router';
import { redirectUnauthorizedTo, AuthGuard } from '@angular/fire/auth-guard';
import { withAuthRoutes } from 'auth';

const redirectUnauthorizedToHome = () => redirectUnauthorizedTo(['home']);

export const ROUTES: Routes = withAuthRoutes([
  {
    path: 'home',
    loadComponent: () =>
      import('@travellers-apps/prices/home/feature').then(
        (m) => m.HomeContainerComponent
      ),
  },
  {
    path: 'add-item',
    loadComponent: () =>
      import('@travellers-apps/prices/add-item/feature').then(
        (m) => m.AddItemContainerComponent
      ),
    canActivate: [AuthGuard],
    data: {
      authGuardPipe: redirectUnauthorizedToHome,
    },
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
]);
