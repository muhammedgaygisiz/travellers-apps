import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/project', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () =>
      import('@travellers-apps/kosaml/auth/feature').then(
        (module) => module.AuthModule
      ),
  },
  {
    path: 'project',
    loadChildren: () =>
      import('@travellers-apps/kosaml/site/feature').then(
        (module) => module.SiteModule
      ),
  },
  {
    path: 'task-scenarios',
    loadChildren: () =>
      import('@travellers-apps/kosaml/task-scenario/feature').then(
        (module) => module.TaskScenarioModule
      ),
  },
  {
    path: 'use-scenarios',
    loadChildren: () =>
      import('@travellers-apps/kosaml/use-scenario/feature').then(
        (module) => module.UseScenarioModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
    }),
  ],
})
export class KosamlShellRoutingModule {}
