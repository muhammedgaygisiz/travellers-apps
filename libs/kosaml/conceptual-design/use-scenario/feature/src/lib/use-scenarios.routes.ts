import { Routes } from '@angular/router';
import { UseScenarioPageComponent } from './containers/use-scenario-page.component';
import { NewUseScenarioPageComponent } from './containers/new-use-scenario-page.component';

export const ROUTES: Routes = [
  {
    path: 'new',
    component: NewUseScenarioPageComponent,
  },
  {
    path: ':id',
    component: UseScenarioPageComponent,
  },
];
