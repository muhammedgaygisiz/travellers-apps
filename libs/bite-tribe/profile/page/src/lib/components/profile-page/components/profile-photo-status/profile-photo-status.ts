import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  PENDING_UPLOAD_RECHECK_MS,
  RetryUploadButtonComponent,
} from 'bite-tribe-common/bite';
import { NetworkStatusService } from 'common/networkstatus';
import type { PublicUser } from 'model';
import { getEffectivePhotoStatus } from '../../../../utils/effective-photo-status';

/**
 * Laid over the own avatar while a newly chosen photo is on its way (GitHub
 * issue #1953): a spinner while it uploads, the Bite photo's retry button
 * once it failed, and an offline mark while a retry could not work. The
 * words are the Bite photo's, read out rather than shown, since the avatar
 * has no room for them.
 */
@Component({
  selector: 'profile-photo-status',
  templateUrl: 'profile-photo-status.html',
  styleUrl: 'profile-photo-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSpinner, RetryUploadButtonComponent, TranslocoPipe],
})
export class ProfilePhotoStatus {
  private readonly networkStatus = inject(NetworkStatusService).status;

  user = input<PublicUser | undefined>();

  /** Asks the page to send the photo again. */
  readonly retryPhotoUpload = output<void>();

  /**
   * Bumped while an upload reads `pending`, so an abandoned one turns into
   * `failed` on screen without anything else changing (as in GitHub issue
   * #1229).
   */
  private readonly pendingRecheck = signal(0);

  readonly photoStatus = computed(() => {
    this.pendingRecheck();

    return getEffectivePhotoStatus(this.user());
  });

  /** Unknown is not offline: a retry that might work beats a wrong message. */
  private readonly isOffline = computed(
    (): boolean => this.networkStatus()?.connected === false,
  );

  constructor() {
    effect((onCleanup) => {
      if (this.photoStatus() !== 'pending') {
        return;
      }

      const timer = setInterval(
        () => this.pendingRecheck.update((count) => count + 1),
        PENDING_UPLOAD_RECHECK_MS,
      );

      onCleanup(() => clearInterval(timer));
    });
  }

  protected readonly canRetry = computed((): boolean => !this.isOffline());
}
