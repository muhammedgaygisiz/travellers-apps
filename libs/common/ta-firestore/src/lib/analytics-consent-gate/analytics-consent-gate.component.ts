import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AnalyticsConsentService } from '../analytics/analytics-consent.service';

/**
 * First-run analytics consent gate.
 *
 * Rendered by the root component in place of the router outlet while the
 * consent decision is still `unset` (issue #989). Collection is already off in
 * that state - {@link AnalyticsConsentService} disables it during startup - so
 * this gate is not what stops collection; it is what ends the undecided state,
 * which otherwise persists and leaves analytics permanently silent.
 *
 * It deliberately does not sit inside the onboarding assistant. The assistant
 * runs after registration, by which point the whole signup flow would already
 * have been measured, so a question there would look like consent while
 * collecting before it.
 *
 * Both switches are set together here. The settings page is where they come
 * apart, because that is where a user who cares about the difference goes.
 */
@Component({
  selector: 'bite-analytics-consent-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, TranslocoPipe],
  template: `
    <ion-content class="consent-gate" [fullscreen]="true">
      <div class="consent-gate__inner">
        <h1 class="consent-gate__title">
          {{ 'analytics-consent-title' | transloco }}
        </h1>
        <p class="consent-gate__copy">
          {{ 'analytics-consent-copy' | transloco }}
        </p>

        <ul class="consent-gate__benefits">
          <li>{{ 'analytics-consent-benefit-features' | transloco }}</li>
          <li>{{ 'analytics-consent-benefit-crashes' | transloco }}</li>
          <li>{{ 'analytics-consent-benefit-never-content' | transloco }}</li>
        </ul>

        <p class="consent-gate__note">
          {{ 'analytics-consent-change-later' | transloco }}
        </p>

        <div class="consent-gate__actions">
          <ion-button
            expand="block"
            data-testid="analytics-consent-allow"
            [disabled]="isSaving()"
            (click)="allow()"
          >
            {{ 'analytics-consent-allow' | transloco }}
          </ion-button>
          <ion-button
            expand="block"
            fill="clear"
            data-testid="analytics-consent-decline"
            [disabled]="isSaving()"
            (click)="decline()"
          >
            {{ 'analytics-consent-decline' | transloco }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    /*
     * Sized the same way as the App Check gate, and for the same reason: it is
     * rendered directly under \`ion-app\` in place of the router outlet, so
     * nothing gives it the size \`.ion-page\` gives a routed page, and
     * \`ion-content\` would otherwise collapse to zero height. See issue #1411.
     */
    :host {
      display: flex;
      position: absolute;
      inset: 0;
      flex-direction: column;
    }

    .consent-gate__inner {
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      min-height: 100%;
      padding: 2rem 1.5rem;
      margin: 0 auto;
      max-width: 30rem;
    }

    .consent-gate__title {
      margin: 0 0 0.75rem;
      font-size: 1.4rem;
    }

    .consent-gate__copy,
    .consent-gate__note {
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    .consent-gate__note {
      font-size: 0.85rem;
      opacity: 0.75;
    }

    .consent-gate__benefits {
      margin: 0 0 1.25rem;
      padding-left: 1.25rem;
      line-height: 1.8;
    }

    .consent-gate__actions {
      margin-top: 0.5rem;
    }
  `,
})
export class AnalyticsConsentGateComponent {
  private readonly consentService = inject(AnalyticsConsentService);

  /**
   * Guards against a double tap producing two writes. It is never cleared:
   * a settled decision removes the gate, and a failed one still resolves, so
   * re-enabling the buttons would only invite a second answer to a question
   * that has already been answered.
   */
  readonly isSaving = signal(false);

  async allow(): Promise<void> {
    await this.save('granted');
  }

  async decline(): Promise<void> {
    await this.save('denied');
  }

  private async save(answer: 'granted' | 'denied'): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    await this.consentService.decide({
      analytics: answer,
      crashReporting: answer,
    });
  }
}
