import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskObjectRoutingModule } from './task-object-routing.module';
import { TaskObjectPageComponent } from './containers/task-object-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { TaskObjectComponent } from './components/task-object/task-object.component';

@NgModule({
  declarations: [TaskObjectPageComponent],
  imports: [
    CommonModule,
    TaskObjectRoutingModule,
    KosamlPageFeatureModule,
    TaskObjectComponent,
  ],
})
export class TaskObjectModule {}
