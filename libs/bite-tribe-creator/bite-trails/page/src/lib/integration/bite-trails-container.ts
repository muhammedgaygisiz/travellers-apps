import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTrailsComponent } from '../components/bite-trails/bite-trails';
import { BiteTrailsService } from './bite-trails.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteTrailsComponent],
  template: `
    <bt-creator-bite-trails
      class="ion-page"
      [biteTrails]="service.biteTrailsValue()"
      [isAuthenticated]="service.isAuthenticated()"
      (createBiteTrailClick)="service.createBiteTrailClicked()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class BiteTrailsContainer {
  service = inject(BiteTrailsService);

  /** Ionic keeps this page alive under the create page, so re-read on return. */
  ionViewWillEnter(): void {
    this.service.refresh();
  }
}
