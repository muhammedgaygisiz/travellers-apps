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
import { BITE_REPORT_REASONS, BiteReportReason, ReportedBite } from 'model';
import type { BiteReportAction } from '../integration/bite-reports.service';

/** One reason and how many reports gave it, for the detail column. */
interface ReasonCount {
  reason: BiteReportReason;
  count: number;
}

/**
 * The operator's report queue: the reported Bites on the left, the selected
 * one on the right (GitHub issue #1608).
 *
 * The same two columns as the Bite lookup, because the errand is the same one
 * - look at what was reported and decide - and the image leads the detail for
 * the reason it leads there: on a reported Bite the image is usually what has
 * to be judged.
 *
 * Three answers, in rising order of consequence. **Dismissing** keeps the Bite
 * and closes its reports. **Blocking** the author stops them signing in and
 * removes nothing, so the Bite stays in the queue. **Deleting** removes the
 * Bite and its reports with it, and is the one that cannot be undone, so it
 * sits last, below a rule, as it does on the Bite lookup. Dismissing and
 * deleting share one reason field, because both are a decision about this Bite
 * and the log entry is the only record of either; blocking takes none, as in
 * user management.
 */
@Component({
  selector: 'lib-bite-reports',
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
  templateUrl: './bite-reports.component.html',
  styleUrl: './bite-reports.component.scss',
})
export class BiteReportsComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly reports = input<ReportedBite[]>([]);
  readonly loading = input(false);
  readonly loaded = input(false);
  readonly failed = input(false);
  readonly truncated = input(false);
  readonly selected = input<ReportedBite | undefined>(undefined);
  readonly authorBlocked = input(false);
  readonly action = input<BiteReportAction | undefined>(undefined);

  readonly reload = output<void>();
  readonly selectBite = output<ReportedBite>();
  readonly deleteBite = output<{ biteId: string; reason: string }>();
  readonly dismissReports = output<{ biteId: string; reason: string }>();
  readonly blockAuthor = output<string>();
  readonly logoutClick = output<void>();

  /**
   * Why the operator decided what they decided.
   *
   * Cleared whenever the selection changes, so a reason typed for one Bite
   * cannot be submitted against another - the rule the Bite lookup follows.
   */
  readonly reason = signal('');

  readonly busy = computed(() => this.action() !== undefined);

  readonly hasReason = computed(() => this.reason().trim().length > 0);

  /** The reasons the reports gave, most frequent first, zeros left out. */
  readonly reasonCounts = computed<ReasonCount[]>(() => {
    const bite = this.selected();

    if (!bite) {
      return [];
    }

    return BITE_REPORT_REASONS.map((reason) => ({
      reason,
      count: bite.reasons[reason] ?? 0,
    }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  readonly canBlock = computed(() => {
    const bite = this.selected();

    return !!bite?.authorUid && !this.authorBlocked() && !this.busy();
  });

  onReasonChange(reason: string): void {
    this.reason.set(reason);
  }

  onSelect(bite: ReportedBite): void {
    this.reason.set('');
    this.selectBite.emit(bite);
  }

  async onDismiss(): Promise<void> {
    const bite = this.selected();

    if (!bite || !this.hasReason()) {
      return;
    }

    const reason = this.reason().trim();

    await this.confirm(
      'admin-reports-dismiss-confirm-title',
      bite,
      'admin-reports-dismiss-confirm-message',
      'admin-reports-dismiss',
      () => {
        this.reason.set('');
        this.dismissReports.emit({ biteId: bite.biteId, reason });
      },
    );
  }

  async onBlockAuthor(): Promise<void> {
    const bite = this.selected();

    if (!bite?.authorUid || !this.canBlock()) {
      return;
    }

    const authorUid = bite.authorUid;

    await this.confirm(
      'admin-reports-block-confirm-title',
      bite,
      'admin-reports-block-confirm-message',
      'admin-reports-block',
      () => this.blockAuthor.emit(authorUid),
      bite.authorDisplayName || authorUid,
    );
  }

  async onDelete(): Promise<void> {
    const bite = this.selected();

    if (!bite?.exists || !this.hasReason()) {
      return;
    }

    const reason = this.reason().trim();

    await this.confirm(
      'admin-bites-delete-confirm-title',
      bite,
      'admin-bites-delete-confirm-message',
      'admin-bites-delete',
      () => {
        this.reason.set('');
        this.deleteBite.emit({ biteId: bite.biteId, reason });
      },
    );
  }

  /**
   * Every answer is confirmed, and the confirmation names what it acts on
   * rather than trusting that the card behind it is still the one being read.
   */
  private async confirm(
    headerKey: string,
    bite: ReportedBite,
    messageKey: string,
    confirmKey: string,
    onConfirm: () => void,
    subject = bite.name || bite.biteId,
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate(headerKey),
      subHeader: subject,
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
