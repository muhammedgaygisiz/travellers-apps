import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EssentialUseCaseRoutingModule } from './essential-use-case-routing.module';
import { EssentialUseCasePageComponent } from './containers/essential-use-case-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';

@NgModule({
  imports: [
    CommonModule,
    EssentialUseCaseRoutingModule,
    KosamlPageFeatureModule,
  ],
  declarations: [EssentialUseCasePageComponent],
})
export class EssentialUseCaseModule {}
