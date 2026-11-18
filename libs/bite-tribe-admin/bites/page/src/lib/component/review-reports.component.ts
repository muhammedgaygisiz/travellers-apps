import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  REVIEW_REPORT_REASONS,
  ReportedReview,
  ReviewReportReason,
} from 'model';
import type { ReviewReportAction } from '../integration/review-reports.service';

/** One reason and how many reports gave it, for the detail column. */
interface ReasonCount {
  reason: ReviewReportReason;
  count: number;
}

/**
 * The operator's queue of reported reviews and replies: the reported items on
 * the left, the selected one on the right (GitHub issue #2117).
 *
 * The layout of the Bite and profile queues. The detail shows the item a reply
 * answers above the reply itself, because a reply that is polite on its own
 * can be harassing in context, and the context is what a reporter saw.
 *
 * Two answers. **Block author** is the existing account block (#1474): it stops
 * the author signing in and removes nothing. **Keep** closes the reports with a
 * reason and takes the review out of the queue. Hiding a review is #2118.
 */
@Component({
  selector: 'lib-review-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonButton,
    IonInput,
    IonSpinner,
    DatePipe,
    TranslocoPipe,
  ],
  templateUrl: './review-reports.component.html',
  styleUrl: './review-reports.component.scss',
})
export class ReviewReportsComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly reports = input<ReportedReview[]>([]);
  readonly loading = input(false);
  readonly loaded = input(false);
  readonly failed = input(false);
  readonly truncated = input(false);
  readonly selected = input<ReportedReview | undefined>(undefined);
  readonly action = input<ReviewReportAction | undefined>(undefined);
  readonly blockedAuthors = input<ReadonlySet<string>>(new Set());

  readonly reload = output<void>();
  readonly selectReview = output<ReportedReview>();
  readonly blockAuthor = output<string>();
  readonly dismissReports = output<{ reviewId: string; reason: string }>();
  readonly logoutClick = output<void>();

  /**
   * Why the operator kept the review. Cleared whenever the selection changes,
   * so a reason typed for one review cannot be submitted against another.
   */
  readonly reason = signal('');

  readonly busy = computed(() => this.action() !== undefined);

  readonly hasReason = computed(() => this.reason().trim().length > 0);

  /** The reasons the reports gave, most frequent first, zeros left out. */
  readonly reasonCounts = computed<ReasonCount[]>(() => {
    const review = this.selected();

    if (!review) {
      return [];
    }

    return REVIEW_REPORT_REASONS.map((reason) => ({
      reason,
      count: review.reasons[reason] ?? 0,
    }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  readonly authorBlocked = computed(() => {
    const uid = this.selected()?.authorUid;

    return !!uid && this.blockedAuthors().has(uid);
  });

  readonly canBlock = computed(() => {
    const review = this.selected();

    return (
      !!review?.exists &&
      !!review.authorUid &&
      !this.authorBlocked() &&
      !this.busy()
    );
  });

  /** What the queue and the confirmations call the author. */
  authorOf(review: ReportedReview): string {
    return review.authorDisplayName || review.authorUid;
  }

  onReasonChange(reason: string): void {
    this.reason.set(reason);
  }

  onSelect(review: ReportedReview): void {
    this.reason.set('');
    this.selectReview.emit(review);
  }

  async onBlockAuthor(): Promise<void> {
    const review = this.selected();

    if (!review || !this.canBlock()) {
      return;
    }

    await this.confirm(
      'admin-reports-block-confirm-title',
      this.authorOf(review),
      'admin-reports-block-confirm-message',
      'admin-reports-block',
      () => this.blockAuthor.emit(review.authorUid),
    );
  }

  async onDismiss(): Promise<void> {
    const review = this.selected();

    if (!review || !this.hasReason()) {
      return;
    }

    const reason = this.reason().trim();

    await this.confirm(
      'admin-review-reports-dismiss-confirm-title',
      this.authorOf(review),
      'admin-review-reports-dismiss-confirm-message',
      'admin-review-reports-keep',
      () => {
        this.reason.set('');
        this.dismissReports.emit({ reviewId: review.reviewId, reason });
      },
    );
  }

  /** Every answer is confirmed, naming the author it concerns. */
  private async confirm(
    headerKey: string,
    subHeader: string,
    messageKey: string,
    confirmKey: string,
    onConfirm: () => void,
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate(headerKey),
      subHeader,
      message: this.transloco.translate(messageKey),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate(confirmKey),
          role: 'destructive',
          handler: onConfirm,
        },
      ],
    });

    await alert.present();
  }
}
