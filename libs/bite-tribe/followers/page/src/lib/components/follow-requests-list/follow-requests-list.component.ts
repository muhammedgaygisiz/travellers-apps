import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PendingFollowRequest } from 'model';
import { PageComponent } from 'common/ui/page';
import { ImageErroredPipe } from '../followers-list/pipes/image-errored.pipe';

/**
 * The own private profile's pending follow requests, newest first (GitHub
 * issue #2165). Each row answers one request with Accept or Decline, and
 * tapping the row opens the requester's profile.
 *
 * A private requester arrives with a display name and no photo, which is all
 * the owner may see of them; a requester without a name reads Anonymous.
 */
@Component({
  selector: 'follow-requests-list',
  imports: [
    PageComponent,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonIcon,
    IonButton,
    TranslocoPipe,
    ImageErroredPipe,
  ],
  templateUrl: 'follow-requests-list.component.html',
  styleUrl: 'follow-requests-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowRequestsListComponent {
  requests = input.required<PendingFollowRequest[]>();
  isLoading = input(false, { transform: booleanAttribute });
  /** The read failed, which is not the same as having no requests. */
  hasError = input(false, { transform: booleanAttribute });
  /** Requesters whose answer is on its way; their buttons wait for it. */
  answeringIds = input<ReadonlySet<string>>(new Set());

  accept = output<PendingFollowRequest>();
  decline = output<PendingFollowRequest>();
  requesterClick = output<PendingFollowRequest>();
  retryClick = output<void>();

  protected readonly imageErroredUserIds = signal<Set<string>>(new Set());

  /**
   * Whether the first read finished. The empty message waits for it, so it
   * never shows while the page has not learnt what is pending - the same rule
   * as the followers list (issue #1876).
   */
  protected readonly listSettled = signal(false);

  private readonly settleList = effect(() => {
    if (!this.isLoading()) {
      this.listSettled.set(true);
    }
  });

  protected readonly isEmpty = computed(() => this.requests().length === 0);

  protected onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  protected onAccept(event: Event, request: PendingFollowRequest): void {
    event.stopPropagation();
    this.accept.emit(request);
  }

  protected onDecline(event: Event, request: PendingFollowRequest): void {
    event.stopPropagation();
    this.decline.emit(request);
  }
}
