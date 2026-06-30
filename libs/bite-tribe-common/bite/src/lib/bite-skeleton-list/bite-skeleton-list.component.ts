import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BiteSkeletonComponent } from '../bite-skeleton/bite-skeleton.component';

@Component({
  selector: 'bt-bite-skeleton-list',
  templateUrl: './bite-skeleton-list.component.html',
  imports: [BiteSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteSkeletonListComponent {}
