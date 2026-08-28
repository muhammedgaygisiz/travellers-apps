import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { NetworkStatusService } from 'common/networkstatus';
import type { Bite } from 'model';
import {
  getEffectiveImageStatus,
  PENDING_UPLOAD_RECHECK_MS,
} from '../utils/image-status';

/**
 * Stands in for a Bite photo that is not there yet, or never arrived.
 *
 * Shared by the feed card and the Bite details page so the two cannot drift:
 * both need the same three-way answer (uploading / failed / show the photo) and
 * the same rule about who is told to keep their app open. Consumers size it
 * through the host element and render the photo only when `imageStatus` is
 * neither `pending` nor `failed`. See GitHub issue #1168.
 */
@Component({
  selector: 'bt-bite-image-status',
  imports: [IonButton, IonIcon, IonSpinner, IonText, TranslocoPipe],
  templateUrl: 'bite-image-status.component.html',
  styleUrl: 'bite-image-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteImageStatusComponent {
  /**
   * Read here rather than passed in, because this component exists so the feed
   * card, the details page and the profile cannot answer the retry question
   * differently. Threading connectivity through each of those chains is four
   * more places for them to drift.
   */
  private readonly networkStatus = inject(NetworkStatusService).status;

  bite = input.required<Bite>();

  /** The signed-in user, used to decide who the pending message speaks to. */
  userId = input<string>();

  /**
   * Whether this surface can act on a retry. Off by default, so a surface that
   * does not handle {@link retryImageUpload} shows no button to press.
   */
  enableRetry = input(false, { transform: booleanAttribute });

  /** Asks the surface to re-send this Bite's photo. */
  readonly retryImageUpload = output<Bite>();

  /**
   * Bumped while a `pending` upload is on screen, purely to invalidate
   * {@link imageStatus}. It carries no time of its own: the status is always
   * answered for the moment it is read, never for the moment this component was
   * created. See {@link PENDING_UPLOAD_RECHECK_MS}.
   */
  private readonly pendingRecheck = signal(0);

  /**
   * The stored status, except that a long-abandoned `pending` upload reads as
   * `failed`.
   *
   * Recomputed whenever the Bite changes and, while it still reads `pending`,
   * on a timer as well. The Bite that lost its photo is exactly the Bite that
   * stops changing: nothing writes to it again, so waiting for the next render
   * left the viewer on the spinner for as long as the page stayed open. See
   * GitHub issue #1229.
   */
  readonly imageStatus = computed(() => {
    this.pendingRecheck();

    return getEffectiveImageStatus(this.bite());
  });

  constructor() {
    effect((onCleanup) => {
      if (this.imageStatus() !== 'pending') {
        return;
      }

      const timer = setInterval(
        () => this.pendingRecheck.update((count) => count + 1),
        PENDING_UPLOAD_RECHECK_MS,
      );

      onCleanup(() => clearInterval(timer));
    });
  }

  /**
   * Only the poster's device is doing the upload, so only the poster can act on
   * it. Everyone else gets a neutral wait message instead of being told to keep
   * their app open for a transfer that is not theirs.
   */
  protected readonly pendingTextKey = computed((): string => {
    return this.isOwnBite() ? 'uploading-keep-app-open' : 'loading-photo';
  });

  /**
   * Whether this viewer is the one who could re-send the photo at all: the
   * photo lives on the poster's device, so nobody else has anything to send.
   */
  private readonly isRetryable = computed((): boolean => {
    return (
      this.enableRetry() && this.imageStatus() === 'failed' && this.isOwnBite()
    );
  });

  /**
   * Offline only when the device has said so. The status is `undefined` until
   * the first Capacitor read resolves, and unknown is not offline: a retry that
   * might work beats a message that might be wrong.
   */
  private readonly isOffline = computed((): boolean => {
    return this.networkStatus()?.connected === false;
  });

  /**
   * The retry is only offered when it could actually do something. A device
   * that reports no connection cannot upload, so pressing the button would buy
   * the poster another thirty seconds of spinner and the same failure back.
   * See GitHub issue #1390.
   */
  protected readonly canRetry = computed((): boolean => {
    return this.isRetryable() && !this.isOffline();
  });

  /**
   * Takes the button's place while the device is offline, so the tile says why
   * there is nothing to press instead of simply dropping the affordance.
   */
  protected readonly showOfflineHint = computed((): boolean => {
    return this.isRetryable() && this.isOffline();
  });

  private readonly isOwnBite = computed((): boolean => {
    const userId = this.userId();

    return !!userId && this.bite().userId === userId;
  });
}
