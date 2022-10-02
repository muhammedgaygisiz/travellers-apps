import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

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
