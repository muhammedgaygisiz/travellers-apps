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
      [bite]="service.bite()"
      [image]="service.image() || ''"
      (submitBite)="service.submitEditedBite($event)"
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
}
