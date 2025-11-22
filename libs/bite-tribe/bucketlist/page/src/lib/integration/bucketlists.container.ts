import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BucketlistsPage } from '../components/bucketlists-page/bucketlists.page';
import { BucketlistsService } from './bucketlists.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <bucketlists-page
      class="ion-page"
      [bucketlists]="service.bucketlists()"
      [sorting]="service.sorting()"
      (gotoBucketlistDetails)="service.gotoBucketlistDetails($event)"
      (newList)="service.createAndSaveToBucketList($event)"
      (sortingChange)="service.sortingChange($event)"
    />
  `,
  imports: [BucketlistsPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BucketlistsContainerComponent {
  service = inject(BucketlistsService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'My Bucketlists',
    });
  }
}
