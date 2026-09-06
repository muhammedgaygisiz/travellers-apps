import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { BiteTribeStoreService } from 'bite-tribe/store';

/**
 * The signed-in home of the admin app.
 *
 * It is deliberately empty of operations. The app it belongs to had to exist,
 * be deployed and be role-gated before any operator surface could be moved into
 * it; shipping the claim review or the candidate verification in the same
 * change would have meant shipping a new privileged surface and its access
 * control together, with neither reviewable on its own (issue #1469).
 *
 * It renders through the shared `ta-page` chrome rather than a bare
 * `ion-header`, so the admin app carries the same header, logo and account menu
 * as the other two. Every menu entry is off: the admin app has no settings,
 * profile or migrations surface yet, and `hideAuth` stays false so the menu
 * still offers logout.
 *
 * The signed-in account is shown in the body because an operator has to be able
 * to tell which identity the tool is acting as before it acts on anyone's
 * restaurant.
 */
@Component({
  selector: 'lib-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true }"
      [isAuthenticated]="true"
      (logoutClick)="logout()"
    >
      <ion-content class="ion-padding">
        <h2 class="admin-dashboard__heading">
          {{ 'admin-dashboard-title' | transloco }}
        </h2>
        <p class="admin-dashboard__message">
          {{ 'admin-dashboard-message' | transloco }}
        </p>
        @if (email(); as signedInEmail) {
          <p class="admin-dashboard__account">
            {{ 'admin-dashboard-signed-in-as' | transloco }}
            {{ signedInEmail }}
          </p>
        }
      </ion-content>
    </ta-page>
  `,
  styles: `
    .admin-dashboard__heading {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .admin-dashboard__message {
      margin: 0;
      max-width: 40rem;
    }

    .admin-dashboard__account {
      margin: 1.5rem 0 0;
      color: var(--ion-color-medium, #6b6b6b);
      font-size: 0.875rem;
    }
  `,
})
export class AdminDashboard {
  private readonly storeService = inject(BiteTribeStoreService);

  readonly email = (): string | undefined =>
    this.storeService.user()?.email ?? undefined;

  logout(): void {
    this.storeService.logout();
  }
}
