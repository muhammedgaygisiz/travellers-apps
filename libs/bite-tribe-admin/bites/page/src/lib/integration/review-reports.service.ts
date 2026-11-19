import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { ReportedReview } from 'model';
import { ReviewReportsDataAccessService } from 'bite-tribe-admin/bites-data-access';

/** The action under way on the selected review, if any. */
export type ReviewReportAction = 'block' | 'dismiss' | 'hide';

/**
 * Runs the operator's queue of reported reviews and replies and holds what it
 * shows (GitHub issue #2117).
 *
 * The shape of `ProfileReportsService`. A blocked author is remembered here
 * rather than read back, because the listing does not carry whether an author
 * is blocked: the review stays in the queue, marked, until it is kept.
 */
@Injectable({ providedIn: 'root' })
export class ReviewReportsService {
  private readonly dataAccess = inject(ReviewReportsDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  private readonly found = signal<ReportedReview[]>([]);
  private readonly selectedId = signal<string | undefined>(undefined);

  readonly loading = signal(false);
  readonly loaded = signal(false);
  /** Surfaced rather than swallowed: a failed load is not an empty queue. */
  readonly failed = signal(false);
  readonly truncated = signal(false);
  readonly action = signal<ReviewReportAction | undefined>(undefined);
  /** Authors blocked from this screen since the queue was loaded. */
  readonly blockedAuthors = signal<ReadonlySet<string>>(new Set());

  readonly reports = computed<ReportedReview[]>(() => this.found());

  readonly selected = computed<ReportedReview | undefined>(() => {
    const id = this.selectedId();

    return id
      ? this.found().find((review) => review.reviewId === id)
      : undefined;
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);

    try {
      const { reviews, truncated } = await this.dataAccess.list();

      this.found.set(reviews);
      this.truncated.set(truncated);
    } catch (error) {
      console.error('Failed to load the reported reviews:', error);
      this.found.set([]);
      this.truncated.set(false);
      this.failed.set(true);
    } finally {
      this.loaded.set(true);
      this.loading.set(false);
    }
  }

  select(review: ReportedReview): void {
    this.selectedId.set(review.reviewId);
  }

  /** Blocks the author. The review stays in the queue until it is kept. */
  async blockAuthor(uid: string): Promise<void> {
    await this.run(
      'block',
      () => this.dataAccess.blockAuthor(uid),
      'admin-review-reports-author-blocked',
      'admin-review-reports-block-failed',
      () => this.blockedAuthors.update((uids) => new Set([...uids, uid])),
    );
  }

  /** Keeps the review: its reports close and it leaves the queue. */
  async dismiss(reviewId: string, reason: string): Promise<void> {
    await this.run(
      'dismiss',
      () => this.dataAccess.dismiss(reviewId, reason),
      'admin-review-reports-dismissed',
      'admin-review-reports-dismiss-failed',
      () =>
        this.found.update((reviews) =>
          reviews.filter((review) => review.reviewId !== reviewId),
        ),
    );
  }

  /**
   * Hides the review from its thread (issue #2118): its reports close with it,
   * so it leaves the queue.
   */
  async hide(reviewId: string, reason: string): Promise<void> {
    await this.run(
      'hide',
      () => this.dataAccess.hide(reviewId, reason),
      'admin-review-reports-hidden',
      'admin-review-reports-hide-failed',
      () =>
        this.found.update((reviews) =>
          reviews.filter((review) => review.reviewId !== reviewId),
        ),
    );
  }

  logout(): void {
    this.storeService.logout();
  }

  private async run(
    action: ReviewReportAction,
    call: () => Promise<unknown>,
    successKey: string,
    failureKey: string,
    onSuccess: () => void,
  ): Promise<void> {
    this.action.set(action);

    try {
      await call();
      onSuccess();
      await this.toastService.present({
        messageKey: successKey,
        outcome: 'success',
      });
    } catch (error) {
      console.error(`Failed to ${action} on a reported review:`, error);
      await this.toastService.present({
        messageKey: failureKey,
        outcome: 'failure',
      });
    } finally {
      this.action.set(undefined);
    }
  }
}
