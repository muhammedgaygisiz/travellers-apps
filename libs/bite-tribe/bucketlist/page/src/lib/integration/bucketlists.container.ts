import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BucketlistsPage } from '../components/bucketlists-page/bucketlists.page';
import { BucketlistsService } from './bucketlists.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'bt-bucketlists',
  template: `
    <bucketlists-page
      class="ion-page"
      [bucketlists]="service.bucketlists()"
      [sorting]="service.sorting()"
      (gotoBucketlistDetails)="service.gotoBucketlistDetails($event)"
      (newList)="service.createAndSaveToBucketList($event)"
      (sortingChange)="service.sortingChange($event)"
      (editBucketlist)="service.gotoEditBucketlist($event)"
      (deleteBucketlist)="service.deleteBucketlist($event)"
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
