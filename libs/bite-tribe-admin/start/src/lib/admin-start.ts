import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The signed-out landing page of the admin app.
 *
 * It exists because `authGuard` sends an unauthenticated visitor to
 * `PATH.START`, so the route has to resolve to something. Unlike the consumer
 * and business start pages there is nothing to market here: the only visitors
 * are operators who already know what this is, so the page says what the tool
 * is and offers the login.
 */
@Component({
  selector: 'lib-admin-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, RouterLink, TranslocoPipe],
  template: `
    <ion-content class="admin-start" [fullscreen]="true">
      <div class="admin-start__inner">
        <h1 class="admin-start__title">
          {{ 'admin-start-title' | transloco }}
        </h1>
        <p class="admin-start__message">
          {{ 'admin-start-message' | transloco }}
        </p>
        <ion-button
          class="admin-start__login"
          expand="block"
          [routerLink]="loginPath"
        >
          {{ 'log-in' | transloco }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    .admin-start {
      --padding-top: calc(1rem + var(--ion-safe-area-top, 0px));
      --padding-bottom: calc(1rem + var(--ion-safe-area-bottom, 0px));
      --padding-start: 1rem;
      --padding-end: 1rem;
    }

    .admin-start__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      min-height: 100%;
      text-align: center;
    }

    .admin-start__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .admin-start__message {
      margin: 0;
      max-width: 28rem;
      color: var(--ion-color-medium, #6b6b6b);
    }

    .admin-start__login {
      width: 100%;
      max-width: 20rem;
    }
  `,
})
export class AdminStart {
  /**
   * `AUTH_ROUTES` registers the login under this literal path, and
   * `AuthService.logout()` navigates to the same literal. There is no `PATH`
   * entry for it to read, so adding one here would create a second spelling of
   * a route neither of those two would use.
   */
  readonly loginPath = '/login';
}
