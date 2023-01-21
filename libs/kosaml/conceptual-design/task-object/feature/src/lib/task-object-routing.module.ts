import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskObjectPageComponent } from './containers/task-object-page.component';

const routes: Routes = [
  {
    path: 'new',
    component: TaskObjectPageComponent,
  },
  {
    path: ':id',
    component: TaskObjectPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TaskObjectRoutingModule {}
