import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EssentialUseCaseRoutingModule } from './essential-use-case-routing.module';
import { EssentialUseCasePageComponent } from './containers/essential-use-case-page.component';
import { KosamlPageFeatureModule } from '@travellers-apps/kosaml/page/feature';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { CpBaseUseCaseComponent } from '@travellers-apps/kosaml/conceptual-design/base/use-case/feature';

@NgModule({
  declarations: [EssentialUseCasePageComponent],
  imports: [
    CommonModule,
    EssentialUseCaseRoutingModule,
    KosamlPageFeatureModule,
    MatTableModule,
    CpBaseUseCaseComponent,
  ],
})
export class EssentialUseCaseModule {}
