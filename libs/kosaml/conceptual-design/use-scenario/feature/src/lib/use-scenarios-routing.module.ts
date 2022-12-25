import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UseScenarioPageComponent } from './containers/use-scenario-page.component';
import { NewUseScenarioPageComponent } from './containers/new-use-scenario-page.component';

const routes: Routes = [
  {
    path: 'new',
    component: NewUseScenarioPageComponent,
  },
  {
    path: ':id',
    component: UseScenarioPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UseScenariosRoutingModule {}
