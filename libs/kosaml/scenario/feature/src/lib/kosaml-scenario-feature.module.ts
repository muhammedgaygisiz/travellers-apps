import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScenarioComponent } from './components/scenario/scenario.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { KosamlCardFeatureModule } from '@travellers-apps/kosaml/card/feature';
import { MatCardModule } from '@angular/material/card';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    KosamlCardFeatureModule,
    MatCardModule,
  ],
  declarations: [ScenarioComponent],
  exports: [ScenarioComponent],
})
export class KosamlScenarioFeatureModule {}
