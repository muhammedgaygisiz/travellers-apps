import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { ReportedBite } from 'model';
import { BiteReportsDataAccessService } from 'bite-tribe-admin/bites-data-access';

/** The action under way on the selected Bite, if any. */
export type BiteReportAction = 'delete' | 'block' | 'dismiss';

/**
 * Runs the operator's report queue and holds what it shows (GitHub issue
 * #1608).
 *
 * The selection is resolved out of the list rather than kept as its own copy,
 * as on the Bite lookup, so a Bite that left the queue cannot linger in the
 * detail column.
 */
@Injectable({ providedIn: 'root' })
export class BiteReportsService {
  private readonly dataAccess = inject(BiteReportsDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  private readonly found = signal<ReportedBite[]>([]);
  private readonly selectedId = signal<string | undefined>(undefined);

  readonly loading = signal(false);

  /** Whether the queue has loaded at all, so "empty" is not said too early. */
  readonly loaded = signal(false);

  /**
   * Surfaced rather than swallowed: an empty queue and a queue that failed to
   * load must not look the same, or an operator stops looking.
   */
  readonly failed = signal(false);

  /** More reports were open than one listing reads. */
  readonly truncated = signal(false);

  /**
   * Authors blocked from this screen during this visit.
   *
   * Remembered so the block button does not offer the same block twice. A
   * block made elsewhere is not known here, and `setUserBlocked` is idempotent
   * for that case.
   */
  private readonly blockedAuthors = signal<ReadonlySet<string>>(new Set());

  readonly action = signal<BiteReportAction | undefined>(undefined);

  readonly reports = computed<ReportedBite[]>(() => this.found());

  readonly selected = computed<ReportedBite | undefined>(() => {
    const id = this.selectedId();

    return id ? this.found().find((bite) => bite.biteId === id) : undefined;
  });

  readonly selectedAuthorBlocked = computed(() => {
    const authorUid = this.selected()?.authorUid;

    return !!authorUid && this.blockedAuthors().has(authorUid);
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);

    try {
      const { bites, truncated } = await this.dataAccess.list();

      this.found.set(bites);
      this.truncated.set(truncated);
    } catch (error) {
      console.error('Failed to load the reported Bites:', error);
      this.found.set([]);
      this.truncated.set(false);
      this.failed.set(true);
    } finally {
      this.loaded.set(true);
      this.loading.set(false);
    }
  }

  select(bite: ReportedBite): void {
    this.selectedId.set(bite.biteId);
  }

  /**
   * Deletes the reported Bite. Its reports are removed with it by the trigger
   * on the Bite's deletion, so it leaves the queue here without a reload.
   */
  async deleteBite(biteId: string, reason: string): Promise<void> {
    await this.run(
      'delete',
      () => this.dataAccess.deleteBite(biteId, reason),
      'admin-reports-deleted',
      'admin-reports-delete-failed',
      () => this.drop(biteId),
    );
  }

  /** Closes the reports on a Bite that stays up. */
  async dismiss(biteId: string, reason: string): Promise<void> {
    await this.run(
      'dismiss',
      () => this.dataAccess.dismiss(biteId, reason),
      'admin-reports-dismissed',
      'admin-reports-dismiss-failed',
      () => this.drop(biteId),
    );
  }

  /**
   * Blocks the author. The Bite stays in the queue: a block removes nothing
   * the author posted, so this Bite is still waiting for a decision.
   */
  async blockAuthor(authorUid: string): Promise<void> {
    await this.run(
      'block',
      () => this.dataAccess.blockAuthor(authorUid),
      'admin-reports-author-blocked',
      'admin-reports-block-failed',
      () =>
        this.blockedAuthors.update(
          (authors) => new Set([...authors, authorUid]),
        ),
    );
  }

  logout(): void {
    this.storeService.logout();
  }

  private drop(biteId: string): void {
    this.found.update((bites) =>
      bites.filter((bite) => bite.biteId !== biteId),
    );
  }

  private async run(
    action: BiteReportAction,
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
      console.error(`Failed to ${action} on a reported Bite:`, error);
      await this.toastService.present({
        messageKey: failureKey,
        outcome: 'failure',
      });
    } finally {
      this.action.set(undefined);
    }
  }
}
