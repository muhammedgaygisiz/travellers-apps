import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskObjectRoutingModule } from './task-object-routing.module';
import { TaskObjectPageComponent } from './containers/task-object-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';

@NgModule({
  declarations: [TaskObjectPageComponent],
  imports: [CommonModule, TaskObjectRoutingModule, KosamlPageFeatureModule],
})
export class TaskObjectModule {}
