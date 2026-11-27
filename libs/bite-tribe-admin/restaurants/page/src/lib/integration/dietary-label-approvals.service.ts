import { inject, Injectable, signal } from '@angular/core';
import { DietaryLabelApprovalsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  dietaryApprovalKey,
  type AnswerDietaryLabelApprovalRequest,
  type DietaryLabelApprovalEntry,
} from 'model';
import { ToastService } from 'toast';

/**
 * Runs the operator's queue of dietary labels waiting for approval (GitHub
 * issue #2198, `R-8`) and holds what it shows. The queue is read again after
 * every answer, so a label another operator answered meanwhile goes too.
 */
@Injectable({ providedIn: 'root' })
export class DietaryLabelApprovalsService {
  private readonly dataAccess = inject(DietaryLabelApprovalsDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  readonly approvals = signal<DietaryLabelApprovalEntry[]>([]);
  readonly loading = signal(false);
  /** Surfaced rather than swallowed: a failed load is not an empty queue. */
  readonly failed = signal(false);
  /** The `dietaryApprovalKey` of the label being answered. */
  readonly answering = signal<string | undefined>(undefined);

  async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);

    try {
      this.approvals.set((await this.dataAccess.list()).approvals);
    } catch (error) {
      console.error('Failed to load the dietary label approvals:', error);
      this.approvals.set([]);
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async answer(request: AnswerDietaryLabelApprovalRequest): Promise<void> {
    if (this.answering()) {
      return;
    }

    this.answering.set(dietaryApprovalKey(request));

    try {
      const { status } = await this.dataAccess.answer(request);

      await this.toastService.present({
        messageKey: `admin-dietary-approval-${status}`,
        outcome: 'success',
      });
      await this.load();
    } catch (error) {
      console.error('Failed to answer the dietary label approval:', error);
      await this.toastService.present({
        messageKey: 'admin-dietary-approval-failed',
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
