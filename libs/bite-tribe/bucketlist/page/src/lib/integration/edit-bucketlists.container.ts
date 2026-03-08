import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditBucketlistPage } from '../components/edit-bucketlist-page/edit-bucketlist.page';
import { EditBucketlistsService } from './edit-bucketlists.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <edit-bucketlist-page
      class="ion-page"
      [bucketlist]="service.selectedBucketlist()"
      [bites]="service.bites()"
      (saveTitle)="service.saveTitle($event)"
      (removeBite)="service.removeBiteFromBucketlist($event)"
    />
  `,
  imports: [EditBucketlistPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditBucketlistsContainerComponent {
  service = inject(EditBucketlistsService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Edit Bucket List',
    });
  }
}
