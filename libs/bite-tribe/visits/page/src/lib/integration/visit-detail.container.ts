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
import { MyVisitsService } from 'bite-tribe/table-order-data-access';
import type { VisitSummary, VisitSummaryRefusalReason } from 'model';
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
    />
  `,
  imports: [VisitDetailPage],
})
export class VisitDetailContainer implements OnInit {
  private readonly service = inject(MyVisitsService);
  private readonly route = inject(ActivatedRoute);

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
    } finally {
      this.loading.set(false);
    }
  }
}
