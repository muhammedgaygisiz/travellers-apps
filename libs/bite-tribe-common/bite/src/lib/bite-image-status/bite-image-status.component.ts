import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IonIcon, IonSpinner, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Bite } from 'model';
import { getEffectiveImageStatus } from '../utils/image-status';

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
  imports: [IonIcon, IonSpinner, IonText, TranslocoPipe],
  templateUrl: 'bite-image-status.component.html',
  styleUrl: 'bite-image-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteImageStatusComponent {
  bite = input.required<Bite>();

  /** The signed-in user, used to decide who the pending message speaks to. */
  userId = input<string>();

  /**
   * The stored status, except that a long-abandoned `pending` upload reads as
   * `failed`. Recomputed whenever the Bite changes rather than on a timer, so a
   * card left open past the threshold flips on its next render (a feed refresh,
   * a navigation, or a document update) instead of mid-view.
   */
  readonly imageStatus = computed(() => getEffectiveImageStatus(this.bite()));

  /**
   * Only the poster's device is doing the upload, so only the poster can act on
   * it. Everyone else gets a neutral wait message instead of being told to keep
   * their app open for a transfer that is not theirs.
   */
  protected readonly pendingTextKey = computed((): string => {
    const userId = this.userId();

    return !!userId && this.bite().userId === userId
      ? 'uploading-keep-app-open'
      : 'loading-photo';
  });
}
