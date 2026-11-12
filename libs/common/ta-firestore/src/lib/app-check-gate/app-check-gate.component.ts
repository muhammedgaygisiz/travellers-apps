import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppCheckReadinessService } from '../app-check-readiness.service';

/**
 * Full-screen App Check gate.
 *
 * Rendered by the root component in place of the router outlet whenever App
 * Check token readiness has not been achieved (issue #933). Because the outlet
 * is not mounted in this state, no protected Firebase screen is shown.
 *
 * **It is a loading screen first.** While {@link AppCheckReadinessService} is
 * `blocked` a bounded recovery is running behind it, and the logo and a
 * spinner are all there is to see: no copy, no control, nothing that says a
 * check is happening. The wait resolves by itself in the common case, and a
 * panel asking for a tap made a person the retry mechanism for something the
 * app does better alone (issue #1465).
 *
 * **The message is what is left when that wait ends without a token.** It
 * says the app could not load and offers a retry, in the words any failed
 * load would use. It does not name the security check: there is nothing a
 * person can do about attestation, and what they can do - check the
 * connection, try again - is the same either way. A tap puts the loading
 * screen back while the re-check runs, so a retry that fails is visibly a
 * retry and not a button that did nothing.
 *
 * **It is not only a startup screen.** A page that started with a token and
 * lost it afterwards lands here too, on the same loading screen with the same
 * recovery behind it (issue #1621).
 */
@Component({
  selector: 'bite-app-check-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, IonSpinner, TranslocoPipe],
  template: `
    <ion-content class="app-check-gate" [fullscreen]="true">
      <div class="app-check-gate__inner">
        @if (isLoading()) {
          <img
            class="app-check-gate__logo"
            src="assets/icons/logo.svg"
            alt=""
          />
          <ion-spinner
            class="app-check-gate__spinner"
            name="crescent"
            role="status"
            [attr.aria-label]="'loading' | transloco"
          />
        } @else {
          <h1 class="app-check-gate__title">
            {{ 'app-check-blocked-title' | transloco }}
          </h1>
          <p class="app-check-gate__message">
            {{ 'app-check-blocked-message' | transloco }}
          </p>
          <ion-button
            class="app-check-gate__retry"
            expand="block"
            (click)="retry()"
          >
            {{ 'app-check-retry' | transloco }}
          </ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: `
    /*
     * The gate is rendered directly under \`ion-app\` in place of the router
     * outlet, so nothing gives it the size that \`.ion-page\` gives a routed
     * page. Without it \`ion-content\` collapses to zero height, the panel's
     * \`min-height: 100%\` resolves against nothing, and the centring goes
     * inert. See GitHub issue #1411.
     */
    :host {
      display: flex;
      position: absolute;
      inset: 0;
      flex-direction: column;
    }

    /*
     * A fullscreen content with no \`ion-header\` starts at y = 0, behind the
     * status bar. Ionic mirrors the platform insets onto these custom
     * properties, so the gate carries them itself.
     */
    .app-check-gate {
      --padding-top: calc(1rem + var(--ion-safe-area-top, 0px));
      --padding-bottom: calc(1rem + var(--ion-safe-area-bottom, 0px));
      --padding-start: 1rem;
      --padding-end: 1rem;
    }

    .app-check-gate__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      min-height: 100%;
      text-align: center;
    }

    .app-check-gate__logo {
      width: auto;
      height: 6rem;
    }

    .app-check-gate__title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .app-check-gate__message {
      margin: 0;
      max-width: 28rem;
      color: var(--ion-color-medium, #6b6b6b);
    }

    .app-check-gate__retry {
      width: 100%;
      max-width: 20rem;
    }
  `,
})
export class AppCheckGateComponent {
  private readonly readiness = inject(AppCheckReadinessService);

  /**
   * Loading for as long as something is still trying: the bounded recovery
   * (`blocked`) or a re-check a tap started. Only the end of the wait,
   * `unavailable` with nothing in flight, shows the message.
   */
  protected readonly isLoading = computed(
    () =>
      this.readiness.status() !== 'unavailable' || this.readiness.isRetrying(),
  );

  retry(): void {
    void this.readiness.retry();
  }
}
