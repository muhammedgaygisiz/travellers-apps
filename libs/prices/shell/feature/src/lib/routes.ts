import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard } from 'ta-firestore';

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
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
]);
