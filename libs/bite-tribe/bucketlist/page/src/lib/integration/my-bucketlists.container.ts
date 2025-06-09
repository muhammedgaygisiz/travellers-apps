import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BucketlistsPage } from '../components/bucketlists-page/bucketlists.page';
import { BucketlistsService } from './bucketlists.service';

@Component({
  template: `
    <bucketlists-page
      class="ion-page"
      [bucketlists]="service.bucketlists()"
      (gotoBucketlistDetails)="service.gotoBucketlistDetails($event)"
    />
  `,
  imports: [BucketlistsPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBucketlistsContainerComponent {
  service = inject(BucketlistsService);
}
