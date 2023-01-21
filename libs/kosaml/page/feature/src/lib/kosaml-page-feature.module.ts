import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from './components/page/page.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { KosamlCardFeatureModule } from '@travellers-apps/kosaml/card/feature';

@NgModule({
  imports: [CommonModule, NgxSkeletonLoaderModule, KosamlCardFeatureModule],
  declarations: [PageComponent, LoadingSpinnerComponent],
  exports: [PageComponent, LoadingSpinnerComponent],
})
export class KosamlPageFeatureModule {}
