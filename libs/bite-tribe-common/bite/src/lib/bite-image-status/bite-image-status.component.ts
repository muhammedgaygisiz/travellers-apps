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
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
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
   * Only the poster is offered the retry: the photo lives on their device, so
   * nobody else has anything to send.
   */
  protected readonly canRetry = computed((): boolean => {
    return (
      this.enableRetry() && this.imageStatus() === 'failed' && this.isOwnBite()
    );
  });

  private readonly isOwnBite = computed((): boolean => {
    const userId = this.userId();

    return !!userId && this.bite().userId === userId;
  });
}
