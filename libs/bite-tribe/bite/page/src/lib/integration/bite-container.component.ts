import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'bite-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bite
    class="ion-page"
    [bite]="service.cachedBite()"
    [currency]="service.currency()"
    [position]="service.position()"
    [image]="service.image() || ''"
    [isNew]="true"
    [nearbyRestaurants]="service.nearbyRestaurants() || []"
    [suggestedTags]="service.tagSuggestionsForEditingBite() || []"
    (submitBite)="service.submitNewBite($event)"
    (placeChange)="onPlaceChange($event)"
  />`,
  imports: [BitePage],
})
export class BiteContainer {
  service = inject(BiteService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'New Bite',
    });
  }

  onPlaceChange(place: string): void {
    const currentBite = this.service.cachedBite() || {};
    const editingBiteWithCurrentPlace = { ...currentBite, place };
    this.service.setEditingBite(editingBiteWithCurrentPlace);
  }
}
