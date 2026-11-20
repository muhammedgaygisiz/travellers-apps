import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FollowRequestsListComponent } from '../components/follow-requests-list/follow-requests-list.component';
import { FollowRequestsService } from './follow-requests.service';

/** The own private profile's pending follow requests (GitHub issue #2165). */
@Component({
  selector: 'follow-requests-container',
  template: `
    <follow-requests-list
      class="ion-page"
      [requests]="service.requests()"
      [isLoading]="service.isLoading()"
      [hasError]="service.hasError()"
      [answeringIds]="service.answeringIds()"
      (accept)="service.accept($event)"
      (decline)="service.decline($event)"
      (requesterClick)="service.requesterClicked($event)"
      (retryClick)="service.reload()"
    />
  `,
  imports: [FollowRequestsListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowRequestsContainer {
  service = inject(FollowRequestsService);

  ionViewWillEnter(): void {
    this.service.enter();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Follow Requests' });
  }
}
