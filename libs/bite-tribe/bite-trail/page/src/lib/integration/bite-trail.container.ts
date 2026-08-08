import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTrailBitesPage } from '../components/bite-trail-bites-page/bite-trail-bites.page';
import { BiteTrailService } from './bite-trail.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'bite-trail-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bite-trail-bites-page
      class="ion-page"
      [bites]="service.bites()"
      [title]="service.title()"
      [userId]="service.userId()"
      [isFree]="service.isFree()"
      [savedBucketlistId]="service.savedBucketlistId()"
      [hasError]="service.hasError()"
      (biteClick)="service.biteClicked($event)"
      (retryClick)="service.retryLoad()"
      (openMapView)="service.openMapView()"
      (getForFree)="service.getForFree()"
      (goToSavedBucketList)="service.goToSavedBucketList()"
    />
  `,
  imports: [BiteTrailBitesPage],
})
export class BiteTrailContainerComponent {
  service = inject(BiteTrailService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bite Trail',
    });
  }
}
