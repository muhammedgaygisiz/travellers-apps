import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskScenariosRoutingModule } from './task-scenarios-routing.module';
import { KosamlConceptualDesignBaseScenarioFeatureModule } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';
import { NewTaskScenarioPageComponent } from './containers/new-task-scenario-page.component';
import { EditTaskScenarioPageComponent } from './containers/edit-task-scenario-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';

@NgModule({
  declarations: [NewTaskScenarioPageComponent, EditTaskScenarioPageComponent],
  imports: [
    CommonModule,
    KosamlPageFeatureModule,
    KosamlConceptualDesignBaseScenarioFeatureModule,
    TaskScenariosRoutingModule,
  ],
})
export class TaskScenarioModule {}
