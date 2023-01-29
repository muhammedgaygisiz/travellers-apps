import { Routes } from '@angular/router';
import { ConcreteUseCasePageComponent } from './concrete-use-case-page.component';

export const ROUTES: Routes = [
  {
    path: 'new',
    component: ConcreteUseCasePageComponent,
  },
  {
    path: ':id',
    component: ConcreteUseCasePageComponent,
  },
];
