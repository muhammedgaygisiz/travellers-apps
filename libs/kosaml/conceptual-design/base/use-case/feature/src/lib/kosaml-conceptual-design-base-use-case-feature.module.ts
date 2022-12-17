import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CpBaseUseCaseComponent } from './components/use-case/cp-base-use-case.component';
import { MatTableModule } from '@angular/material/table';

@NgModule({
  imports: [CommonModule, MatTableModule],
  declarations: [CpBaseUseCaseComponent],
  exports: [CpBaseUseCaseComponent],
})
export class KosamlConceptualDesignBaseUseCaseFeatureModule {}
