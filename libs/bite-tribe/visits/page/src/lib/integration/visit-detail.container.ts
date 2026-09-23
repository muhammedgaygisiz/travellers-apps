import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import {
  MyVisitsService,
  biteFromOrderLine,
} from 'bite-tribe/table-order-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { PATH } from 'utils';
import type {
  TableVisitBillLine,
  VisitSummary,
  VisitSummaryRefusalReason,
} from 'model';
import { VisitDetailPage } from '../components/visit-detail-page/visit-detail.page';

/**
 * The sentence each refusal is told with.
 *
 * The same two keys the table order screen uses, deliberately: a guest told
 * one thing at the table and a different thing a week later would be two
 * accounts of one document.
 */
const REFUSAL_KEYS: Readonly<Record<VisitSummaryRefusalReason, string>> = {
  notFound: 'visit-summary-preparing',
  sessionExpired: 'visit-summary-expired',
} as const;

@Component({
  selector: 'bt-visit-detail-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-visit-detail-page
      class="ion-page"
      [summary]="summary()"
      [loading]="loading()"
      [refusalKey]="refusalKey()"
      (retry)="load()"
      (createBite)="startBite($event)"
    />
  `,
  imports: [VisitDetailPage],
})
export class VisitDetailContainer implements OnInit {
  private readonly service = inject(MyVisitsService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(BiteTribeStoreService);
  private readonly navController = inject(NavController);
  private readonly analytics = inject(AnalyticsService);
  private readonly authService = inject(AuthService);

  private readonly read = signal<VisitSummary | undefined>(undefined);
  private readonly refusal = signal<VisitSummaryRefusalReason | undefined>(
    undefined,
  );

  protected readonly loading = signal(false);
  protected readonly summary = computed(() => this.read());
  protected readonly refusalKey = computed(() => {
    const reason = this.refusal();

    return reason ? REFUSAL_KEYS[reason] : '';
  });

  ngOnInit(): void {
    void this.load();
  }

  /**
   * Hands the Bite form a dish that has already been eaten
   * (GitHub issue #1112).
   *
   * Through the store's cached bite, which is how the menu-item flow has
   * prefilled the form since before this issue: the form reads `cachedBite`
   * on load, so the draft is handed over rather than pushed through the
   * router - and it survives the navigation, a reload, and the account upgrade
   * an anonymous guest goes through on the other screen.
   */
  startBite(line: TableVisitBillLine): void {
    const meal = this.read();

    if (!meal) {
      return;
    }

    this.analytics.logEvent(AnalyticsEvent.TableBiteStarted, {
      restaurant_id: meal.restaurantId,
      visit_id: meal.id,
      has_account: !!this.authService.getMember(),
      surface: 'visit_detail',
    });

    this.store.cacheBite(biteFromOrderLine(meal, line));
    void this.navController.navigateForward([PATH.NEW_BITE]);
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Visit Summary' });
  }

  /**
   * Reads the one meal this route names.
   *
   * The read goes through the data-access library rather than the api one:
   * a `type:feature` may depend on `type:data-access` and not on `type:api`,
   * which the boundaries said out loud the first time this file reached past
   * them.
   */
  async load(): Promise<void> {
    const visitId = this.route.snapshot.paramMap.get('visitId') ?? '';

    if (!visitId || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.refusal.set(undefined);

    try {
      const result = await this.service.readOne(visitId);

      if (!result.ok) {
        this.refusal.set(result.reason);

        return;
      }

      this.read.set(result.summary);

      // The same offer as the table screen's, a day or a week later - which is
      // what `surface` is for. Once per read is once per visit here: this
      // container reads one meal, named by the route (issue #1114).
      this.analytics.logEvent(AnalyticsEvent.TableBitePromptShown, {
        restaurant_id: result.summary.restaurantId,
        visit_id: result.summary.id,
        has_account: !!this.authService.getMember(),
        surface: 'visit_detail',
      });
    } finally {
      this.loading.set(false);
    }
  }
}
