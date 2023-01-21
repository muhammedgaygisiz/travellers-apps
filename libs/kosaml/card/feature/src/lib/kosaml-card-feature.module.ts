import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from './card.component';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';

@NgModule({
  imports: [CommonModule, MatCardModule],
  declarations: [CardComponent],
  exports: [CardComponent],
})
export class KosamlCardFeatureModule {}
