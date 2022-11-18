import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskScenariosRoutingModule } from './task-scenarios-routing.module';
import { KosamlScenarioFeatureModule } from '@travellers-apps/kosaml/scenario/feature';
import { PageComponent } from './components/page/page.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { NewTaskScenarioPageComponent } from './containers/new-task-scenario-page.component';
import { EditTaskScenarioPageComponent } from './containers/edit-task-scenario-page.component';
import { KosamlCardFeatureModule } from '@travellers-apps/kosaml/card/feature';

@NgModule({
  declarations: [
    PageComponent,
    LoadingSpinnerComponent,
    NewTaskScenarioPageComponent,
    EditTaskScenarioPageComponent,
  ],
  imports: [
    CommonModule,
    KosamlScenarioFeatureModule,
    TaskScenariosRoutingModule,
    KosamlScenarioFeatureModule,
    NgxSkeletonLoaderModule,
    KosamlCardFeatureModule,
  ],
})
export class TaskScenarioModule {}
