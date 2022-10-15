import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {
  AngularFireAuthGuard,
  redirectUnauthorizedTo,
} from '@angular/fire/compat/auth-guard';

const redirectUnauthorizedToHome = () => redirectUnauthorizedTo(['home']);

const routes: Routes = [
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
    canActivate: [AngularFireAuthGuard],
    data: {
      authGuardPipe: redirectUnauthorizedToHome,
    },
  },
  {
    path: 'login',
    loadChildren: () =>
      import('@travellers-apps/prices/auth/feature').then((m) => m.AuthModule),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class PricesShellRoutingModule {}
