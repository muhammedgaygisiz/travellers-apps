import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
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
/**
 * Which card a tool sits in (issue #1490). `primary` is the work an operator
 * does day to day; `secondary` is the one-off migrations and backfills, kept
 * reachable but out of the way of the daily list.
 */
export type AdminToolGroup = 'primary' | 'secondary';

interface AdminTool {
  readonly group: AdminToolGroup;
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
    IonCardHeader,
    IonCardTitle,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    TranslocoPipe,
  ],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true }"
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

          <div class="admin-dashboard__groups">
            @for (group of groups; track group.key) {
              <ion-card class="admin-dashboard__group">
                <ion-card-header>
                  <ion-card-title class="admin-dashboard__group-title">{{
                    group.titleKey | transloco
                  }}</ion-card-title>
                </ion-card-header>
                <ion-card-content class="admin-dashboard__tools">
                  <ion-list
                    lines="full"
                    [attr.data-testid]="'admin-tools-' + group.key"
                  >
                    @for (tool of group.tools; track tool.path) {
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
            }
          </div>

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
      max-width: 72rem;
      text-align: center;
    }

    /*
     * Two cards side by side once there is room for two readable columns,
     * one above the other below that. The primary card comes first in both,
     * so a narrow screen still opens on the daily work.
     */
    .admin-dashboard__groups {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    @media (min-width: 960px) {
      .admin-dashboard__groups {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .admin-dashboard__group {
      margin: 0;
    }

    .admin-dashboard__group-title {
      font-size: 1.125rem;
      text-align: start;
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
   * account has been granted a role, and it is also where an operator finds an
   * account: the filter lives on the page that holds the form, because finding
   * an account and acting on it are one errand. Bite search is its counterpart
   * and needs an entry of its own, because there is no Bite list to filter
   * (issue #1476). Reported Bites sit between the two, because a report is
   * where most Bite work starts and the lookup is where it goes when a report
   * names a Bite the queue does not hold (issue #1608). Reported profiles
   * follow reported Bites, because they are the same queue for another kind of
   * report (issue #1829). Restaurant verification comes next because it is the daily
   * work; the migrations below it are each their own entry rather than one
   * "migrations" page, so an operator reaches the one they came for instead of
   * scrolling past five Bite tables (issue #1473). Restaurant ownership sits
   * next to verification because it is the step after it: a restaurant is
   * verified, then handed to the account that runs it (issue #1077).
   */
  readonly tools: readonly AdminTool[] = [
    {
      titleKey: 'admin-tool-user-management',
      descriptionKey: 'admin-tool-user-management-description',
      icon: 'people-outline',
      path: '/user-management',
      testId: 'admin-tool-user-management',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-bite-reports',
      descriptionKey: 'admin-tool-bite-reports-description',
      icon: 'flag-outline',
      path: '/bite-reports',
      testId: 'admin-tool-bite-reports',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-profile-reports',
      descriptionKey: 'admin-tool-profile-reports-description',
      icon: 'person-circle-outline',
      path: '/profile-reports',
      testId: 'admin-tool-profile-reports',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-bite-search',
      descriptionKey: 'admin-tool-bite-search-description',
      icon: 'search-outline',
      path: '/bite-search',
      testId: 'admin-tool-bite-search',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-landing-pages',
      descriptionKey: 'admin-tool-landing-pages-description',
      icon: 'globe-outline',
      path: '/landing-pages',
      testId: 'admin-tool-landing-pages',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-restaurant-candidates',
      descriptionKey: 'admin-tool-restaurant-candidates-description',
      icon: 'shield-checkmark-outline',
      path: '/restaurant-candidates',
      testId: 'admin-tool-restaurant-candidates',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-restaurant-ownership',
      descriptionKey: 'admin-tool-restaurant-ownership-description',
      icon: 'business-outline',
      path: '/restaurant-ownership',
      testId: 'admin-tool-restaurant-ownership',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-table-sessions',
      descriptionKey: 'admin-tool-table-sessions-description',
      icon: 'people-outline',
      path: '/table-sessions',
      testId: 'admin-tool-table-sessions',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-bite-places',
      descriptionKey: 'admin-tool-bite-places-description',
      icon: 'storefront-outline',
      path: '/bite-places',
      testId: 'admin-tool-bite-places',
      group: 'primary',
    },
    {
      titleKey: 'admin-tool-new-version-notification',
      descriptionKey: 'admin-tool-new-version-notification-description',
      icon: 'notifications-outline',
      path: '/new-version-notification',
      testId: 'admin-tool-new-version-notification',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-review-timestamps-backfill',
      descriptionKey: 'admin-tool-review-timestamps-backfill-description',
      icon: 'time-outline',
      path: '/review-timestamps-backfill',
      testId: 'admin-tool-review-timestamps-backfill',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-menu-item-ids-backfill',
      descriptionKey: 'admin-tool-menu-item-ids-backfill-description',
      icon: 'fast-food-outline',
      path: '/menu-item-ids-backfill',
      testId: 'admin-tool-menu-item-ids-backfill',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-restaurant-owner-ids-migration',
      descriptionKey: 'admin-tool-restaurant-owner-ids-migration-description',
      icon: 'people-outline',
      path: '/restaurant-owner-ids-migration',
      testId: 'admin-tool-restaurant-owner-ids-migration',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-bite-image-status-backfill',
      descriptionKey: 'admin-tool-bite-image-status-backfill-description',
      icon: 'images-outline',
      path: '/bite-image-status-backfill',
      testId: 'admin-tool-bite-image-status-backfill',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-bite-countries-rebuild',
      descriptionKey: 'admin-tool-bite-countries-rebuild-description',
      icon: 'earth-outline',
      path: '/bite-countries-rebuild',
      testId: 'admin-tool-bite-countries-rebuild',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-menu-item-stats-recompute',
      descriptionKey: 'admin-tool-menu-item-stats-recompute-description',
      icon: 'stats-chart-outline',
      path: '/menu-item-stats-recompute',
      testId: 'admin-tool-menu-item-stats-recompute',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-bite-address-backfill',
      descriptionKey: 'admin-tool-bite-address-backfill-description',
      icon: 'location-outline',
      path: '/bite-address-backfill',
      testId: 'admin-tool-bite-address-backfill',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-restaurant-clustering',
      descriptionKey: 'admin-tool-restaurant-clustering-description',
      icon: 'restaurant-outline',
      path: '/restaurant-clustering',
      testId: 'admin-tool-restaurant-clustering',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-image-migration',
      descriptionKey: 'admin-tool-image-migration-description',
      icon: 'image-outline',
      path: '/image-migration',
      testId: 'admin-tool-image-migration',
      group: 'secondary',
    },
    {
      titleKey: 'admin-tool-geohash-migration',
      descriptionKey: 'admin-tool-geohash-migration-description',
      icon: 'map-outline',
      path: '/geohash-migration',
      testId: 'admin-tool-geohash-migration',
      group: 'secondary',
    },
  ];

  /** The two cards, each with its tools in the order of {@link tools}. */
  readonly groups: readonly {
    readonly key: AdminToolGroup;
    readonly titleKey: string;
    readonly tools: readonly AdminTool[];
  }[] = [
    {
      key: 'primary',
      titleKey: 'admin-dashboard-primary',
      tools: this.tools.filter((tool) => tool.group === 'primary'),
    },
    {
      key: 'secondary',
      titleKey: 'admin-dashboard-secondary',
      tools: this.tools.filter((tool) => tool.group === 'secondary'),
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
