import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UseScenarioPageComponent } from './containers/use-scenario-page.component';
import { KosamlScenarioFeatureModule } from '@travellers-apps/kosaml/scenario/feature';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { NewUseScenarioPageComponent } from './containers/new-use-scenario-page.component';
import { UseScenariosRoutingModule } from './use-scenarios-routing.module';

@NgModule({
  declarations: [UseScenarioPageComponent, NewUseScenarioPageComponent],
  imports: [
    CommonModule,
    KosamlPageFeatureModule,
    KosamlScenarioFeatureModule,
    UseScenariosRoutingModule,
  ],
})
export class UseScenarioModule {}
