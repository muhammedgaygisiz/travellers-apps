import { computed, inject, Injectable, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileApiService } from 'bite-tribe/api';
import type { PendingFollowRequest } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { resourceFailed, resourceValue } from 'utils';

/**
 * The own private profile's pending follow requests (GitHub issue #2165).
 *
 * Read through the `listFollowRequests` callable, because the owner may not
 * read a private requester's user document. Accept and Decline go through
 * their callables, which write or skip the follow edges in one transaction.
 */
@Injectable({ providedIn: 'root' })
export class FollowRequestsDataAccessService {
  private readonly profileApiService = inject(ProfileApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  private readonly ownUid = toSignal(this.storeService.userId$, {
    initialValue: '',
  });

  private readonly blockedUserIds = toSignal(
    this.storeService.blockedUserIds$,
    { initialValue: [] as string[] },
  );

  requests = resource({
    params: () => (this.ownUid() ? { uid: this.ownUid() } : undefined),
    loader: () => this.profileApiService.listFollowRequests(),
  });

  private readonly loadedRequests = resourceValue(
    this.requests,
    [] as PendingFollowRequest[],
  );

  /**
   * The list, without an account blocked since it was read. The callable
   * already leaves out the accounts the owner blocks; this covers one blocked
   * from another page while the list was held.
   */
  requestsValue = computed((): PendingFollowRequest[] => {
    const blocked = new Set(this.blockedUserIds());

    return this.loadedRequests().filter(
      ({ requesterUid }) => !blocked.has(requesterUid),
    );
  });

  /** True once the read failed, so the page says so instead of looking empty. */
  requestsFailed = resourceFailed(this.requests);

  async accept(requesterUid: string): Promise<void> {
    await this.profileApiService.acceptFollowRequest(requesterUid);
  }

  async decline(requesterUid: string): Promise<void> {
    await this.profileApiService.declineFollowRequest(requesterUid);
  }
}
