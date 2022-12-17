import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EssentialUseCaseRoutingModule } from './essential-use-case-routing.module';
import { EssentialUseCasePageComponent } from './containers/essential-use-case-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { MatTableModule } from '@angular/material/table';
import { EssentialUseCaseComponent } from './components/essential-use-case.component';

@NgModule({
  declarations: [EssentialUseCaseComponent, EssentialUseCasePageComponent],
  imports: [
    CommonModule,
    EssentialUseCaseRoutingModule,
    KosamlPageFeatureModule,
    MatTableModule,
  ],
})
export class EssentialUseCaseModule {}
