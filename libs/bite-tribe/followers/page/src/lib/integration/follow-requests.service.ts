import { computed, inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { FollowRequestsDataAccessService } from 'bite-tribe/followers-data-access';
import type { PendingFollowRequest } from 'model';
import { ToastService } from 'toast';
import { PATH } from 'utils';

/**
 * The own private profile's follow requests page (GitHub issue #2165).
 *
 * An answered request leaves the list as soon as its callable answers, without
 * reading the list again. A refused answer keeps the row and says so.
 */
@Injectable({ providedIn: 'root' })
export class FollowRequestsService {
  private readonly navController = inject(NavController);
  private readonly dataAccess = inject(FollowRequestsDataAccessService);
  private readonly toast = inject(ToastService);

  private readonly answeredIds = signal<ReadonlySet<string>>(new Set());

  /** Requesters whose Accept or Decline is on its way. */
  readonly answeringIds = signal<ReadonlySet<string>>(new Set());

  readonly isLoading = this.dataAccess.requests.isLoading;
  readonly hasError = this.dataAccess.requestsFailed;

  readonly requests = computed((): PendingFollowRequest[] => {
    const answered = this.answeredIds();

    return this.dataAccess
      .requestsValue()
      .filter(({ requesterUid }) => !answered.has(requesterUid));
  });

  private entered = false;

  /**
   * The page was entered. The first entry is served by the read the resource
   * starts itself; every later one reads the list again, because the service
   * outlives the page and a request may have come in or gone since.
   */
  enter(): void {
    if (this.entered) {
      this.reload();
    }

    this.entered = true;
  }

  /** Reads the list again. */
  reload(): void {
    this.answeredIds.set(new Set());
    this.dataAccess.requests.reload();
  }

  accept(request: PendingFollowRequest): Promise<void> {
    return this.answer(
      request,
      () => this.dataAccess.accept(request.requesterUid),
      'follow-request-accept-failed',
    );
  }

  decline(request: PendingFollowRequest): Promise<void> {
    return this.answer(
      request,
      () => this.dataAccess.decline(request.requesterUid),
      'follow-request-decline-failed',
    );
  }

  requesterClicked(request: PendingFollowRequest): void {
    this.navController.navigateForward([PATH.PROFILE, request.requesterUid]);
  }

  private async answer(
    { requesterUid }: PendingFollowRequest,
    send: () => Promise<void>,
    failureKey: string,
  ): Promise<void> {
    if (this.answeringIds().has(requesterUid)) {
      return;
    }

    this.answeringIds.update((ids) => new Set([...ids, requesterUid]));

    try {
      await send();
      this.answeredIds.update((ids) => new Set([...ids, requesterUid]));
    } catch (error) {
      console.error('Could not answer the follow request:', error);

      await this.toast.present({
        messageKey: failureKey,
        outcome: 'failure',
      });
    } finally {
      this.answeringIds.update((ids) => {
        const next = new Set(ids);
        next.delete(requesterUid);

        return next;
      });
    }
  }
}
