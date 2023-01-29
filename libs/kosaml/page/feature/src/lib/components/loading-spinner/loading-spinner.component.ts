import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardComponent } from '@travellers-apps/kosaml/card/feature';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  standalone: true,
  selector: 'kosaml-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  imports: [CardComponent, NgxSkeletonLoaderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {}
