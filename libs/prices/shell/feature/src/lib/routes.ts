import { Routes } from '@angular/router';
import { redirectUnauthorizedTo, AuthGuard } from '@angular/fire/auth-guard';

const redirectUnauthorizedToHome = () => redirectUnauthorizedTo(['home']);

export const ROUTES: Routes = [
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
    path: 'login',
    loadChildren: () =>
      import('@travellers-apps/prices/auth/feature').then((m) => m.ROUTES),
  },
  {
    path: 'registration',
    loadChildren: () =>
      import('@travellers-apps/prices/registration/feature').then(
        (m) => m.ROUTES
      ),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
