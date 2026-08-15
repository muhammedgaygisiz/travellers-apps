import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';
import { BucketlistsPage } from '../components/bucketlists-page/bucketlists.page';
import { BucketlistsService } from './bucketlists.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'bt-bucketlists',
  template: `
    <bucketlists-page
      class="ion-page"
      [bucketlists]="service.bucketlists()"
      (gotoBucketlistDetails)="service.gotoBucketlistDetails($event)"
      (newList)="service.createAndSaveToBucketList($event)"
      (editBucketlist)="service.gotoEditBucketlist($event)"
      (deleteBucketlist)="service.deleteBucketlist($event)"
      (rateBucketlist)="service.gotoRateBucketlist($event)"
    />

    <bt-coach-mark
      surface="bucket-lists"
      titleKey="coach-bucket-lists-title"
      bodyKey="coach-bucket-lists-body"
    />
  `,
  imports: [BucketlistsPage, CoachMarkComponent],
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
