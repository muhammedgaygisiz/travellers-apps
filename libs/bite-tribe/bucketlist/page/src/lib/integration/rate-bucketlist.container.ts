import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RateBucketlistPage } from '../components/rate-bucketlist-page/rate-bucketlist.page';
import { RateBucketlistService } from './rate-bucketlist.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <rate-bucketlist-page
      class="ion-page"
      [bucketlist]="service.selectedBucketlist()"
      [existingRating]="service.existingRating()"
      [isSubmitting]="service.isSubmitting()"
      (submitRating)="service.submitRating($event)"
    />
  `,
  imports: [RateBucketlistPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateBucketlistContainerComponent {
  service = inject(RateBucketlistService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Rate Bite Trail',
    });
  }
}
