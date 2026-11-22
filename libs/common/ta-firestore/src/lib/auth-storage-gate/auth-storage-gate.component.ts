import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * What every web app shows in place of its pages while the browser's storage
 * for the session does not answer (GitHub issue #2253).
 *
 * Nothing in the app can fix that: the storage is held by something outside
 * the page, most often another tab of the same app. So the gate says what the
 * user can do and offers a reload; it lifts by itself if the storage frees up
 * while it is shown. Laid out like the App Check gate, which sits in the same
 * place for the same kind of reason.
 */
@Component({
  selector: 'bite-auth-storage-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, TranslocoPipe],
  template: `
    <ion-content class="auth-storage-gate" [fullscreen]="true">
      <div class="auth-storage-gate__inner" role="alert">
        <h1 class="auth-storage-gate__title">
          {{ 'auth-storage-stuck-title' | transloco }}
        </h1>
        <p class="auth-storage-gate__message">
          {{ 'auth-storage-stuck-message' | transloco }}
        </p>
        <ion-button
          class="auth-storage-gate__reload"
          expand="block"
          (click)="reload()"
        >
          {{ 'auth-storage-stuck-reload' | transloco }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    /*
     * In place of the router outlet inside \`ion-app\`, whose \`.ion-page\` hands
     * its children no height: the host takes the whole app itself.
     */
    :host {
      display: flex;
      position: absolute;
      inset: 0;
      flex-direction: column;
    }

    .auth-storage-gate {
      --padding-top: calc(1rem + var(--ion-safe-area-top, 0px));
      --padding-bottom: calc(1rem + var(--ion-safe-area-bottom, 0px));
      --padding-start: 1rem;
      --padding-end: 1rem;
    }

    .auth-storage-gate__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      min-height: 100%;
      text-align: center;
    }

    .auth-storage-gate__title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .auth-storage-gate__message {
      margin: 0;
      max-width: 28rem;
      color: var(--ion-color-medium, #6b6b6b);
    }

    .auth-storage-gate__reload {
      width: 100%;
      max-width: 20rem;
    }
  `,
})
export class AuthStorageGateComponent {
  /** A reload is the one step that can work once the other tab has let go. */
  reload(): void {
    globalThis.location.reload();
  }
}
