import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TripDetailService } from 'bite-tribe/store';
import { MapPageComponent } from '../components/map-page/map-page.component';
import { MapService } from './map.service';

/**
 * A trip's Bites on a map as its route: numbered from 1 for the oldest and
 * joined in that order by straight lines. Bites without a position stay in
 * the list only. Clustering is off, or a cluster would hide stops the line
 * runs through (issue #2355).
 */
@Component({
  selector: 'trip-map-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPageComponent],
  providers: [TripDetailService],
  template: `
    <map-page
      class="ion-page"
      [bites]="detail.stops()"
      [markerLabels]="detail.stopNumbers()"
      [showRoute]="true"
      [clusterMarkers]="false"
      [isAuthenticated]="service.isAuthenticated()"
      [userId]="service.userId()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
    />
  `,
})
export class TripMapContainerComponent {
  protected readonly service = inject(MapService);
  protected readonly detail = inject(TripDetailService);
  private readonly route = inject(ActivatedRoute);

  ionViewWillEnter(): void {
    this.detail.enter(this.route.snapshot.paramMap.get('tripId') ?? '');
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Trip Map' });
  }
}
