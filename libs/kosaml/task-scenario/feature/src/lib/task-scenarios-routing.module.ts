import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditTaskScenarioPageComponent } from './containers/edit-task-scenario-page.component';
import { NewTaskScenarioPageComponent } from './containers/new-task-scenario-page.component';

const routes: Routes = [
  {
    path: 'new',
    component: NewTaskScenarioPageComponent,
  },
  {
    path: ':id',
    component: EditTaskScenarioPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TaskScenariosRoutingModule {}
