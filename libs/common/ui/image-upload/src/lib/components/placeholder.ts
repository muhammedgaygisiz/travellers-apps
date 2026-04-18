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
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'placeholder',
  template: `
    <div
      class="ion-display-flex ion-flex-column ion-align-items-center ion-justify-content-center container ion-text-center"
    >
      @if (isDragging()) {
        <ion-icon name="hand-right-outline" size="large" />
        <ion-note class="hint ion-margin-top">
          <b>
            {{ 'drag-and-drop-not-supported' | transloco }}
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

        <ion-note
          class="ion-display-inline-flex ion-align-items-center hint ion-margin-top"
        >
          @if (!disabled()) {
            <b innerHtml="{{ 'tap-into-box' | transloco }}"></b>
          } @else {
            <b>
              {{ 'image-upload-disabled' | transloco }}
            </b>
          }
        </ion-note>
      }
    </div>
  `,
  styles: `
    :host {
      .hint {
        gap: 0.25rem;

        color: var(--ion-text-color-step-400);
        text-align: center;
      }
    }
  `,
  imports: [IonIcon, IonNote, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Placeholder {
  private readonly platform = inject(Platform);

  isWeb = signal(!this.platform.is('hybrid'));

  isDragging = input(false);
  disabled = input(false, { transform: booleanAttribute });
}
