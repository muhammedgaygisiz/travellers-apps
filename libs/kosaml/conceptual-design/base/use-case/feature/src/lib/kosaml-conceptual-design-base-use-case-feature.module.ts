import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CpBaseUseCaseComponent } from './components/use-case/cp-base-use-case.component';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';

@NgModule({
  imports: [CommonModule, MatTableModule],
  declarations: [CpBaseUseCaseComponent],
  exports: [CpBaseUseCaseComponent],
})
export class KosamlConceptualDesignBaseUseCaseFeatureModule {}
