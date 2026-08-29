import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppCheckReadinessService } from '../app-check-readiness.service';

/**
 * Full-screen App Check retry gate.
 *
 * Rendered by the root component in place of the router outlet while App Check
 * enforcement is on and token readiness has not been achieved (issue #933).
 * Because the outlet is never mounted in this state and initial navigation is
 * held, no protected Firebase screen is shown. The retry button re-runs the
 * token preflight through {@link AppCheckReadinessService}; on success the
 * service resumes auth and initial navigation and the gate is removed.
 */
@Component({
  selector: 'bite-app-check-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, IonSpinner, TranslocoPipe],
  template: `
    <ion-content class="app-check-gate" [fullscreen]="true">
      <div class="app-check-gate__inner">
        <h1 class="app-check-gate__title">
          {{ 'app-check-blocked-title' | transloco }}
        </h1>
        <p class="app-check-gate__message">
          {{ 'app-check-blocked-message' | transloco }}
        </p>
        <ion-button
          class="app-check-gate__retry"
          expand="block"
          [disabled]="isRetrying()"
          (click)="retry()"
        >
          @if (isRetrying()) {
            <ion-spinner name="crescent" slot="start" />
          }
          {{ 'app-check-retry' | transloco }}
        </ion-button>
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

  readonly isRetrying = this.readiness.isRetrying;

  retry(): void {
    void this.readiness.retry();
  }
}
