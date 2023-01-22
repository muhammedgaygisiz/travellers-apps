import { Routes } from '@angular/router';

export const routes: Routes = [
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
        (module) => module.ROUTES
      ),
  },
  {
    path: 'task-scenarios',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/task-scenario/feature'
      ).then((module) => module.ROUTES),
  },
  {
    path: 'use-scenarios',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/use-scenario/feature'
      ).then((module) => module.ROUTES),
  },
  {
    path: 'essential-use-cases',
    loadChildren: () =>
      import(
        '@travellers-apps/kosaml/conceptual-design/essential-use-case/feature'
      ).then((module) => module.ROUTES),
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
      ).then((module) => module.ROUTES),
  },
];
