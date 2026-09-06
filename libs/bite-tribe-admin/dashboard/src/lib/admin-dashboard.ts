import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { BiteTribeStoreService } from 'bite-tribe/store';

/** One operator surface the admin app offers. */
interface AdminTool {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly icon: string;
  readonly path: string;
  readonly testId: string;
}

/**
 * The admin app's home: a centred list of the operator surfaces it offers.
 *
 * It is a list rather than the business dashboard's data columns because the
 * two answer different questions. The business dashboard shows a restaurant the
 * map and its own surfaces; this shows an operator what the tool can do, one
 * entry per surface.
 */
@Component({
  selector: 'lib-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    TranslocoPipe,
  ],
  template: `
    <ta-page
      [chrome]="{ showFooter: false }"
      [isAuthenticated]="true"
      (logoutClick)="logout()"
    >
      <ion-content class="ion-padding">
        <div class="admin-dashboard">
          <h2 class="admin-dashboard__heading">
            {{ 'admin-dashboard-title' | transloco }}
          </h2>
          <p class="admin-dashboard__message">
            {{ 'admin-dashboard-message' | transloco }}
          </p>

          <ion-card>
            <ion-card-content class="admin-dashboard__tools">
              <ion-list lines="full" data-testid="admin-tools">
                @for (tool of tools; track tool.path) {
                  <ion-item
                    [button]="true"
                    [attr.data-testid]="tool.testId"
                    (click)="open(tool)"
                  >
                    <ion-icon
                      [name]="tool.icon"
                      slot="start"
                      aria-hidden="true"
                    />
                    <ion-label>
                      <h3>{{ tool.titleKey | transloco }}</h3>
                      <p>{{ tool.descriptionKey | transloco }}</p>
                    </ion-label>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          @if (email(); as signedInEmail) {
            <p class="admin-dashboard__account">
              {{ 'admin-dashboard-signed-in-as' | transloco }}
              {{ signedInEmail }}
            </p>
          }
        </div>
      </ion-content>
    </ta-page>
  `,
  styles: `
    .admin-dashboard {
      margin: 0 auto;
      max-width: 40rem;
      text-align: center;
    }

    .admin-dashboard__heading {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .admin-dashboard__message {
      margin: 0 0 1.5rem;
      color: var(--ion-color-medium, #6b6b6b);
    }

    /* The list itself reads left-aligned; only the page is centred. */
    .admin-dashboard__tools {
      text-align: start;
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
  private readonly router = inject(Router);

  /**
   * Every operator surface, in the order an operator meets them.
   *
   * User management is first because nothing else in the tool works until an
   * account has been granted a role. Restaurant verification comes next because
   * it is the daily work; the migrations below it are each their own entry
   * rather than one "migrations" page, so an operator reaches the one they came
   * for instead of scrolling past five Bite tables (issue #1473).
   */
  readonly tools: readonly AdminTool[] = [
    {
      titleKey: 'admin-tool-user-management',
      descriptionKey: 'admin-tool-user-management-description',
      icon: 'people-outline',
      path: '/user-management',
      testId: 'admin-tool-user-management',
    },
    {
      titleKey: 'admin-tool-restaurant-candidates',
      descriptionKey: 'admin-tool-restaurant-candidates-description',
      icon: 'shield-checkmark-outline',
      path: '/restaurant-candidates',
      testId: 'admin-tool-restaurant-candidates',
    },
    {
      titleKey: 'admin-tool-bite-places',
      descriptionKey: 'admin-tool-bite-places-description',
      icon: 'storefront-outline',
      path: '/bite-places',
      testId: 'admin-tool-bite-places',
    },
    {
      titleKey: 'admin-tool-new-version-notification',
      descriptionKey: 'admin-tool-new-version-notification-description',
      icon: 'notifications-outline',
      path: '/new-version-notification',
      testId: 'admin-tool-new-version-notification',
    },
    {
      titleKey: 'admin-tool-review-timestamps-backfill',
      descriptionKey: 'admin-tool-review-timestamps-backfill-description',
      icon: 'time-outline',
      path: '/review-timestamps-backfill',
      testId: 'admin-tool-review-timestamps-backfill',
    },
    {
      titleKey: 'admin-tool-bite-address-backfill',
      descriptionKey: 'admin-tool-bite-address-backfill-description',
      icon: 'location-outline',
      path: '/bite-address-backfill',
      testId: 'admin-tool-bite-address-backfill',
    },
    {
      titleKey: 'admin-tool-restaurant-clustering',
      descriptionKey: 'admin-tool-restaurant-clustering-description',
      icon: 'restaurant-outline',
      path: '/restaurant-clustering',
      testId: 'admin-tool-restaurant-clustering',
    },
    {
      titleKey: 'admin-tool-image-migration',
      descriptionKey: 'admin-tool-image-migration-description',
      icon: 'image-outline',
      path: '/image-migration',
      testId: 'admin-tool-image-migration',
    },
    {
      titleKey: 'admin-tool-geohash-migration',
      descriptionKey: 'admin-tool-geohash-migration-description',
      icon: 'map-outline',
      path: '/geohash-migration',
      testId: 'admin-tool-geohash-migration',
    },
  ];

  readonly email = (): string | undefined =>
    this.storeService.user()?.email ?? undefined;

  open(tool: AdminTool): void {
    void this.router.navigateByUrl(tool.path);
  }

  logout(): void {
    this.storeService.logout();
  }
}
