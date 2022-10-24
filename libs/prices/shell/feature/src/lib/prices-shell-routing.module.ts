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
    loadChildren: () =>
      import('@travellers-apps/prices/home/feature').then(
        (m) => m.HomeComponentModule
      ),
  },
  {
    path: 'add-item',
    loadChildren: () =>
      import('@travellers-apps/prices/add-item/feature').then(
        (m) => m.AddItemModule
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
    path: 'register',
    loadChildren: () =>
      import('@travellers-apps/prices/registration/feature').then(
        (m) => m.RegistrationModule
      ),
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
