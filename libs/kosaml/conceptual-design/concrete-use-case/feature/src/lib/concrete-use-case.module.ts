import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConcreteUseCaseRoutingModule } from './concrete-use-case-routing.module';
import { ConcreteUseCasePageComponent } from './containers/concrete-use-case-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { CpBaseUseCaseComponent } from '@travellers-apps/kosaml/conceptual-design/base/use-case/feature';

@NgModule({
  declarations: [ConcreteUseCasePageComponent],
  imports: [
    CommonModule,
    ConcreteUseCaseRoutingModule,
    KosamlPageFeatureModule,
    CpBaseUseCaseComponent,
  ],
})
export class ConcreteUseCaseModule {}
