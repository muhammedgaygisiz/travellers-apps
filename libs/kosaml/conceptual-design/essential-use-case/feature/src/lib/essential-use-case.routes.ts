import { Routes } from '@angular/router';
import { EssentialUseCasePageComponent } from './essential-use-case-page.component';

export const ROUTES: Routes = [
  {
    path: 'new',
    component: EssentialUseCasePageComponent,
  },
  {
    path: ':id',
    component: EssentialUseCasePageComponent,
  },
];
