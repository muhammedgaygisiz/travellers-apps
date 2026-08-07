import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
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
      [currencyLoading]="service.isCurrencyLoading()"
      [favCurrencies]="service.favCurrencies()"
      [position]="service.position()"
      [image]="service.image() || ''"
      [isNew]="true"
      [nearbyRestaurants]="service.nearbyRestaurants() || []"
      [suggestedTags]="service.tagSuggestionsForEditingBite() || []"
      [googlePlaces]="service.googlePlaces()"
      [googlePlacesLoading]="service.googlePlacesLoading()"
      [nearbyGooglePlaces]="service.nearbyGooglePlaces()"
      [nearbyGooglePlacesLoading]="service.nearbyGooglePlacesLoading()"
      (submitBite)="service.submitNewBite($event)"
      (submitBiteAndAddAnother)="service.submitNewBiteAndAddAnother($event)"
      (placeChange)="onPlaceChange($event)"
      (searchGooglePlaces)="service.searchGooglePlaces($event)"
      (requestNearbyGooglePlaces)="service.loadNearbyGooglePlaces($event)"
      (positionChange)="onPositionChange($event)"
    />
  `,
  imports: [BitePage],
})
export class CreateBiteContainer implements OnDestroy {
  service = inject(BiteService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'New Bite',
    });
  }

  /**
   * The prefilled draft belongs to this creation session only. Leaving the form
   * — cancelling, going back, or posting the Bite — ends the session, so the
   * draft is dropped here instead of surviving in the store and prefilling the
   * next, unrelated Create Bite (issue #1233).
   *
   * Ionic destroys the page when it is popped off the navigation stack, so this
   * runs on every way out of the form while a forward navigation, which keeps
   * the page on the stack, leaves the draft alone.
   */
  ngOnDestroy(): void {
    this.service.clearCachedBite();
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
