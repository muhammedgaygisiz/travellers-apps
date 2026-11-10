import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The one button that re-sends a photo whose upload failed, on a Bite and on
 * the own profile alike, so the two read as the same action (GitHub issue
 * #1953). Its background is the page's, so it stays readable laid over a
 * photo as well as on a card.
 *
 * `short` is for the profile avatar, which is too narrow for the full label.
 */
@Component({
  selector: 'bt-retry-upload-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, TranslocoPipe],
  template: `
    <ion-button
      fill="outline"
      size="small"
      data-testid="retry-upload-button"
      [attr.aria-label]="'retry-upload' | transloco"
      (click)="onClick($event)"
    >
      <ion-icon slot="start" name="refresh-outline" aria-hidden="true" />
      {{ (short() ? 'retry-upload-short' : 'retry-upload') | transloco }}
    </ion-button>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    ion-button {
      --background: var(--ion-background-color, #fff);
      margin: 0;
    }
  `,
})
export class RetryUploadButtonComponent {
  readonly short = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();

  /** Stops here, so a surface that is itself tappable does not retry twice. */
  protected onClick(event: Event): void {
    event.stopPropagation();
    this.retry.emit();
  }
}
