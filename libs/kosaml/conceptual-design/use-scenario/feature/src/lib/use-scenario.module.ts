import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UseScenarioPageComponent } from './containers/use-scenario-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { NewUseScenarioPageComponent } from './containers/new-use-scenario-page.component';
import { UseScenariosRoutingModule } from './use-scenarios-routing.module';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';

@NgModule({
  declarations: [UseScenarioPageComponent, NewUseScenarioPageComponent],
  imports: [
    CommonModule,
    KosamlPageFeatureModule,
    ScenarioComponent,
    UseScenariosRoutingModule,
  ],
})
export class UseScenarioModule {}
