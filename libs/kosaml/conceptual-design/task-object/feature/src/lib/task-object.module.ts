import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskObjectRoutingModule } from './task-object-routing.module';
import { TaskObjectPageComponent } from './containers/task-object-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { MatTableModule } from '@angular/material/table';
import { TaskObjectComponent } from './components/task-object/task-object.component';

@NgModule({
  declarations: [TaskObjectPageComponent, TaskObjectComponent],
  imports: [
    CommonModule,
    TaskObjectRoutingModule,
    KosamlPageFeatureModule,
    MatTableModule,
  ],
})
export class TaskObjectModule {}
