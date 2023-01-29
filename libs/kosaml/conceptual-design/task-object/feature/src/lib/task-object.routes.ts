import { Routes } from '@angular/router';
import { TaskObjectPageComponent } from './task-object-page.component';

export const ROUTES: Routes = [
  {
    path: 'new',
    component: TaskObjectPageComponent,
  },
  {
    path: ':id',
    component: TaskObjectPageComponent,
  },
];
