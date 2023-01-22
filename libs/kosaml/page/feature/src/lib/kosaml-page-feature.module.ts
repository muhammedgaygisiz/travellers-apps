import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from './components/page/page.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { CardComponent } from '@travellers-apps/kosaml/card/feature';

@NgModule({
  imports: [CommonModule, NgxSkeletonLoaderModule, CardComponent],
  declarations: [PageComponent, LoadingSpinnerComponent],
  exports: [PageComponent, LoadingSpinnerComponent],
})
export class KosamlPageFeatureModule {}
