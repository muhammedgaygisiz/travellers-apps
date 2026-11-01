import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { ReportedUser, USER_REPORT_REASONS, UserReportReason } from 'model';
import type { ProfileReportAction } from '../integration/profile-reports.service';

/** One reason and how many reports gave it, for the detail column. */
interface ReasonCount {
  reason: UserReportReason;
  count: number;
}

/**
 * The operator's queue of reported profiles: the profiles on the left, the
 * selected one on the right (GitHub issue #1829).
 *
 * The Bite report queue's layout, for the same errand. The detail leads with
 * who the account presents as - photo, display name, about - and then its
 * recent Bites, because abuse on a profile is often a pattern across them
 * rather than one thing.
 *
 * Two answers. **Blocking** is the existing account block (#1474): it stops the
 * account signing in, removes nothing, and leaves the reports open. **Closing**
 * the reports takes a reason, like a Bite dismissal, and is what takes the
 * profile out of the queue, whether the account was blocked or is fine.
 */
@Component({
  selector: 'lib-profile-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonButton,
    IonInput,
    IonSpinner,
    DatePipe,
    TranslocoPipe,
  ],
  templateUrl: './profile-reports.component.html',
  styleUrl: './profile-reports.component.scss',
})
export class ProfileReportsComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly reports = input<ReportedUser[]>([]);
  readonly loading = input(false);
  readonly loaded = input(false);
  readonly failed = input(false);
  readonly truncated = input(false);
  readonly selected = input<ReportedUser | undefined>(undefined);
  readonly action = input<ProfileReportAction | undefined>(undefined);

  readonly reload = output<void>();
  readonly selectProfile = output<ReportedUser>();
  readonly blockAccount = output<string>();
  readonly dismissReports = output<{ uid: string; reason: string }>();
  readonly logoutClick = output<void>();

  /**
   * Why the operator closed the reports. Cleared whenever the selection
   * changes, so a reason typed for one profile cannot be submitted against
   * another.
   */
  readonly reason = signal('');

  readonly busy = computed(() => this.action() !== undefined);

  readonly hasReason = computed(() => this.reason().trim().length > 0);

  /** The reasons the reports gave, most frequent first, zeros left out. */
  readonly reasonCounts = computed<ReasonCount[]>(() => {
    const user = this.selected();

    if (!user) {
      return [];
    }

    return USER_REPORT_REASONS.map((reason) => ({
      reason,
      count: user.reasons[reason] ?? 0,
    }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  readonly canBlock = computed(() => {
    const user = this.selected();

    return !!user?.exists && !user.blocked && !this.busy();
  });

  /** What the queue and the confirmations call the account. */
  nameOf(user: ReportedUser): string {
    return user.displayName || user.uid;
  }

  onReasonChange(reason: string): void {
    this.reason.set(reason);
  }

  onSelect(user: ReportedUser): void {
    this.reason.set('');
    this.selectProfile.emit(user);
  }

  async onBlockAccount(): Promise<void> {
    const user = this.selected();

    if (!user || !this.canBlock()) {
      return;
    }

    await this.confirm(
      'admin-reports-block-confirm-title',
      user,
      'admin-reports-block-confirm-message',
      'admin-profile-reports-block',
      () => this.blockAccount.emit(user.uid),
    );
  }

  async onDismiss(): Promise<void> {
    const user = this.selected();

    if (!user || !this.hasReason()) {
      return;
    }

    const reason = this.reason().trim();

    await this.confirm(
      'admin-profile-reports-dismiss-confirm-title',
      user,
      'admin-profile-reports-dismiss-confirm-message',
      'admin-profile-reports-dismiss',
      () => {
        this.reason.set('');
        this.dismissReports.emit({ uid: user.uid, reason });
      },
    );
  }

  /** Every answer is confirmed, naming the account it acts on. */
  private async confirm(
    headerKey: string,
    user: ReportedUser,
    messageKey: string,
    confirmKey: string,
    onConfirm: () => void,
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate(headerKey),
      subHeader: this.nameOf(user),
      message: this.transloco.translate(messageKey),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate(confirmKey),
          role: 'destructive',
          handler: onConfirm,
        },
      ],
    });

    await alert.present();
  }
}
