import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  NewVersionNotificationState,
  ReleasePlatform,
} from '../../model/new-version-notification';

const NEW_VERSION_STATUS_KEYS: Record<
  NewVersionNotificationState['status'],
  string
> = {
  sending: 'new-version-notification-sending',
  sent: 'new-version-notification-sent',
  failed: 'new-version-notification-failed',
};

/**
 * Announces a released app version to one store's installations.
 *
 * Its own operator surface rather than a section of one long migrations page:
 * an operator opens this the moment a store starts serving a build, and has no
 * reason to scroll past a Bite table to reach it (issue #1473).
 */
@Component({
  selector: 'lib-new-version-notification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonButton, TranslocoPipe],
  templateUrl: './new-version-notification.html',
  styleUrl: '../migration-page.scss',
})
export class NewVersionNotification {
  readonly notification = input<NewVersionNotificationState | null>(null);

  readonly sendNewVersionNotification = output<ReleasePlatform>();
  readonly logoutClick = output<void>();

  /** True while a send is in flight, so neither button can fire twice. */
  readonly isSending = computed(
    () => this.notification()?.status === 'sending',
  );

  /**
   * The Transloco key describing the last announcement, or `null` when none has
   * been triggered in this session.
   */
  readonly statusKey = computed(() => {
    const state = this.notification();

    return state ? NEW_VERSION_STATUS_KEYS[state.status] : null;
  });

  /** Interpolation for the status message: which store, and how far it got. */
  readonly statusParams = computed(() => {
    const state = this.notification();

    return {
      platform: state?.platform ?? '',
      tokenCount: state?.result?.tokenCount ?? 0,
      userCount: state?.result?.userCount ?? 0,
    };
  });

  notifyNewVersion(platform: ReleasePlatform): void {
    this.sendNewVersionNotification.emit(platform);
  }
}
