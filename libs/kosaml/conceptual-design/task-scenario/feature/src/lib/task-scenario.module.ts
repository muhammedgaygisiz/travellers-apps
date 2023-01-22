import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskScenariosRoutingModule } from './task-scenarios-routing.module';
import { NewTaskScenarioPageComponent } from './containers/new-task-scenario-page.component';
import { EditTaskScenarioPageComponent } from './containers/edit-task-scenario-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';

@NgModule({
  declarations: [NewTaskScenarioPageComponent, EditTaskScenarioPageComponent],
  imports: [
    CommonModule,
    KosamlPageFeatureModule,
    ScenarioComponent,
    TaskScenariosRoutingModule,
  ],
})
export class TaskScenarioModule {}
