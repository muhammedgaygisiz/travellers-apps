import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonChip } from '@ionic/angular/standalone';

@Component({
  template: `
    <div class="like-options-container">
      <ion-chip>👍</ion-chip>
      <ion-chip>🤤</ion-chip>
      <ion-chip>🤯</ion-chip>
    </div>
  `,
  styles: `
    .like-options-container {
      width: 100%;

      display: flex;
      justify-content: space-evenly;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonChip],
})
export class LikeOptionsPopoverMenuComponent {}
