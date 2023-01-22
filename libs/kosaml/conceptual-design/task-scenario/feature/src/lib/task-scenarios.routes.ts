import { Routes } from '@angular/router';
import { EditTaskScenarioPageComponent } from './containers/edit-task-scenario-page.component';
import { NewTaskScenarioPageComponent } from './containers/new-task-scenario-page.component';

export const ROUTES: Routes = [
  {
    path: 'new',
    component: NewTaskScenarioPageComponent,
  },
  {
    path: ':id',
    component: EditTaskScenarioPageComponent,
  },
];
