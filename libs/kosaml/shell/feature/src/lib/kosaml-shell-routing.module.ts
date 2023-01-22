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
      import(
        '@travellers-apps/kosaml/conceptual-design/task-scenario/feature'
      ).then((module) => module.TaskScenarioModule),
  },
  {
    path: 'use-scenarios',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/use-scenario/feature'
      ).then((module) => module.UseScenarioModule),
  },
  {
    path: 'essential-use-cases',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/essential-use-case/feature'
      ).then((module) => module.EssentialUseCaseModule),
  },
  {
    path: 'concrete-use-cases',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/concrete-use-case/feature'
      ).then((m) => m.ROUTES),
  },
  {
    path: 'task-objects',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/task-object/feature'
      ).then((module) => module.TaskObjectModule),
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
