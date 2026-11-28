import { inject, Injectable, signal } from '@angular/core';
import { DietaryLabelRemovalsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type {
  AnswerDietaryLabelRemovalRequest,
  DietaryLabelRemovalEntry,
} from 'model';
import { ToastService } from 'toast';

/**
 * Runs the operator's queue of removed dietary labels (GitHub issue #2199)
 * and holds what it shows. The queue is read again after every decision, so
 * an item another operator answered meanwhile goes too.
 */
@Injectable({ providedIn: 'root' })
export class DietaryLabelRemovalsService {
  private readonly dataAccess = inject(DietaryLabelRemovalsDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  readonly removals = signal<DietaryLabelRemovalEntry[]>([]);
  readonly loading = signal(false);
  /** Surfaced rather than swallowed: a failed load is not an empty queue. */
  readonly failed = signal(false);
  /** The removal being decided. */
  readonly answering = signal<string | undefined>(undefined);

  async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);

    try {
      this.removals.set((await this.dataAccess.list()).removals);
    } catch (error) {
      console.error('Failed to load the removed dietary labels:', error);
      this.removals.set([]);
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async answer(request: AnswerDietaryLabelRemovalRequest): Promise<void> {
    if (this.answering()) {
      return;
    }

    this.answering.set(request.removalId);

    try {
      const { status } = await this.dataAccess.answer(request);

      await this.toastService.present({
        messageKey: `admin-dietary-removal-${status}`,
        outcome: 'success',
      });
      await this.load();
    } catch (error) {
      console.error('Failed to answer the dietary label removal:', error);
      await this.toastService.present({
        messageKey: 'admin-dietary-removal-failed',
        outcome: 'failure',
      });
    } finally {
      this.answering.set(undefined);
    }
  }

  logout(): void {
    this.storeService.logout();
  }
}
