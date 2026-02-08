import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BitePage } from '../components/page/bite.page';
import { BiteService } from './bite.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bite
      class="ion-page"
      title="Edit Bite"
      [bite]="service.bite.value()"
      [image]="service.image() || ''"
      [nearbyRestaurants]="service.nearbyRestaurants() || []"
      [suggestedTags]="service.tagSuggestionsForEditingBite() || []"
      (submitBite)="service.submitEditedBite($event)"
      (placeChange)="onPlaceChange($event)"
    />
  `,
  imports: [BitePage],
})
export class EditBiteContainer {
  service = inject(BiteService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Edit Bite',
    });
  }

  onPlaceChange(place: string): void {
    const currentBite = this.service.bite.value();
    if (currentBite) {
      this.service.setEditingBite({ ...currentBite, place });
    }
  }
}
