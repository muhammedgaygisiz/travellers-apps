import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from 'ta-firestore';

/**
 * The signed-in home of the admin app.
 *
 * It is deliberately empty of operations. The app it belongs to had to exist,
 * be deployed and be role-gated before any operator surface could be moved into
 * it; shipping the claim review or the candidate verification in the same
 * change would have meant shipping a new privileged surface and its access
 * control together, with neither reviewable on its own (issue #1469).
 *
 * What it does show is the signed-in account, so an operator can tell which
 * identity the tool is acting as before it can act at all.
 */
@Component({
  selector: 'lib-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, TranslocoPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'admin-dashboard-title' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="admin-dashboard">
      <p class="admin-dashboard__message">
        {{ 'admin-dashboard-message' | transloco }}
      </p>
      @if (email(); as signedInEmail) {
        <p class="admin-dashboard__account">{{ signedInEmail }}</p>
      }
    </ion-content>
  `,
  styles: `
    .admin-dashboard {
      --padding-top: 1rem;
      --padding-bottom: 1rem;
      --padding-start: 1rem;
      --padding-end: 1rem;
    }

    .admin-dashboard__message {
      margin: 0;
      max-width: 40rem;
    }

    .admin-dashboard__account {
      margin: 1rem 0 0;
      color: var(--ion-color-medium, #6b6b6b);
      font-size: 0.875rem;
    }
  `,
})
export class AdminDashboard {
  private readonly authService = inject(AuthService);

  readonly email = (): string | undefined =>
    this.authService.getUser()?.email ?? undefined;
}
