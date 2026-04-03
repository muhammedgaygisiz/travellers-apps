import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { IonIcon, IonNote } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'placeholder',
  template: `
    <div class="container ion-text-center">
      @if (isDragging()) {
        <ion-icon name="hand-right-outline" size="large" />
        <ion-note class="hint ion-margin-top">
          <b>
            Drag & drop is not supported. <br />Tap to upload or take a photo.
          </b>
        </ion-note>
      } @else {
        @if (!disabled()) {
          @if (isWeb()) {
            <ion-icon name="image-outline" size="large" />
          } @else {
            <ion-icon name="camera-outline" size="large" />
          }
        } @else {
          <ion-icon name="cloud-offline-outline" size="large" />
        }

        <ion-note class="hint ion-margin-top">
          @if (!disabled()) {
            <b> Tap into the box to upload <br />or take a photo. </b>
          } @else {
            <b>
              It seems you are offline. You can still create a bite without an
              image and add one later when you are back online.
            </b>
          }
        </ion-note>
      }
    </div>
  `,
  styles: `
    :host {
      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .hint {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;

        color: var(--ion-text-color-step-400);
        text-align: center;
      }
    }
  `,
  imports: [IonIcon, IonNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Placeholder {
  private readonly platform = inject(Platform);

  isWeb = signal(!this.platform.is('hybrid'));

  isDragging = input(false);
  disabled = input(false, { transform: booleanAttribute });
}
