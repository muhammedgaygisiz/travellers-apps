import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import type { Geopoint } from 'model';

@Component({
  selector: 'create-bite-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bite
      class="ion-page"
      [bite]="service.cachedBite()"
      [currency]="service.effectiveCurrency()"
      [favCurrencies]="service.favCurrencies()"
      [position]="service.position()"
      [image]="service.image() || ''"
      [isNew]="true"
      [nearbyRestaurants]="service.nearbyRestaurants() || []"
      [suggestedTags]="service.tagSuggestionsForEditingBite() || []"
      [networkStatus]="service.networkStatus()"
      (submitBite)="service.submitNewBite($event)"
      (placeChange)="onPlaceChange($event)"
      (positionChange)="onPositionChange($event)"
    />
  `,
  imports: [BitePage],
})
export class CreateBiteContainer {
  service = inject(BiteService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'New Bite',
    });
  }

  onPlaceChange(place: string): void {
    const currentBite = this.service.cachedBite() || {};
    const editingBiteWithCurrentPlace = { ...currentBite, place };
    this.service.setEditingBite(editingBiteWithCurrentPlace);
  }

  onPositionChange(position: Geopoint): void {
    void this.service.determineCurrencyForPosition(position);
  }
}
