import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { map } from 'rxjs';
import { AuthService } from '../auth.service';
import { isBiteTribeRole } from 'utils';

/**
 * Where `roleGuard` sends a signed-in account that lacks the role a route
 * requires.
 *
 * It exists so the rejection is a statement rather than a redirect. Bouncing
 * such an account back to `START` sends it to a page whose only offer is the
 * login it has already completed: a dead end that describes the problem as a
 * sign-in failure when signing in again cannot fix it (issue #1469).
 *
 * The missing role arrives as the `role` query parameter and is validated
 * before it is shown: it comes from a URL, so it is user input, and an
 * unrecognised value falls back to the generic message rather than rendering
 * whatever was in the address bar.
 *
 * Signing out is the one action offered, because it is the only one that
 * helps: the account that needs access is granted the role by an operator, and
 * a different account is reached by signing in as that account.
 */
@Component({
  selector: 'bite-no-access',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, TranslocoPipe],
  template: `
    <ion-content class="no-access" [fullscreen]="true">
      <div class="no-access__inner">
        <h1 class="no-access__title">{{ 'no-access-title' | transloco }}</h1>
        <p class="no-access__message">
          @if (role(); as missingRole) {
            {{ 'no-access-message-role' | transloco: { role: missingRole } }}
          } @else {
            {{ 'no-access-message' | transloco }}
          }
        </p>
        <ion-button class="no-access__logout" expand="block" (click)="logout()">
          {{ 'logout' | transloco }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    :host {
      display: flex;
      position: absolute;
      inset: 0;
      flex-direction: column;
    }

    .no-access {
      --padding-top: calc(1rem + var(--ion-safe-area-top, 0px));
      --padding-bottom: calc(1rem + var(--ion-safe-area-bottom, 0px));
      --padding-start: 1rem;
      --padding-end: 1rem;
    }

    .no-access__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      min-height: 100%;
      text-align: center;
    }

    .no-access__title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .no-access__message {
      margin: 0;
      max-width: 28rem;
      color: var(--ion-color-medium, #6b6b6b);
    }

    .no-access__logout {
      width: 100%;
      max-width: 20rem;
    }
  `,
})
export class NoAccessComponent {
  private readonly authService = inject(AuthService);

  readonly role = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => params.get('role')),
      map((role) => (isBiteTribeRole(role) ? role : undefined)),
    ),
  );

  logout(): void {
    void this.authService.logout();
  }
}
