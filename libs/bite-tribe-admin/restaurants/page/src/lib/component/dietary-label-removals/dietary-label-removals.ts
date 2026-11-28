import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  DIETARY_DISPUTE_REASONS,
  MIN_DIETARY_REMOVAL_DECISION_REASON_LENGTH,
  type AnswerDietaryLabelRemovalRequest,
  type DietaryDisputeReason,
  type DietaryLabelRemovalEntry,
} from 'model';

/**
 * The removed dietary labels waiting for an operator (GitHub issue #2199):
 * one card each, with the disputes that removed it - their reasons, notes and
 * dates, never who - its confirmations, and the owner's explanation and
 * evidence photo when the owner asked for it back. The operator restores the
 * label or confirms the removal, with a reason; restoring needs no request,
 * so a removal by brigading can be reversed on sight.
 */
@Component({
  selector: 'lib-dietary-label-removals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonSpinner,
    IonTextarea,
    TranslocoPipe,
  ],
  templateUrl: './dietary-label-removals.html',
  styles: `
    /* The measure every other operator list uses. */
    .dietary-label-removals {
      margin: 0 auto;
      max-width: 40rem;
    }

    .evidence {
      max-width: 100%;
      max-height: 20rem;
      border-radius: 0.5rem;
    }

    .decision {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .answers {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
  `,
})
export class DietaryLabelRemovals {
  readonly removals = input<DietaryLabelRemovalEntry[]>([]);
  readonly loading = input(false);
  readonly failed = input(false);
  readonly answering = input<string | undefined>();

  readonly answer = output<AnswerDietaryLabelRemovalRequest>();
  readonly reload = output<void>();
  readonly logoutClick = output<void>();

  /** The reason typed on each card, by removal id. */
  readonly reasons = signal<Record<string, string>>({});

  reasonOf(removalId: string): string {
    return this.reasons()[removalId] ?? '';
  }

  setReason(removalId: string, reason: string | null | undefined): void {
    this.reasons.update((reasons) => ({
      ...reasons,
      [removalId]: reason ?? '',
    }));
  }

  canDecide(removalId: string): boolean {
    return (
      !this.answering() &&
      this.reasonOf(removalId).trim().length >=
        MIN_DIETARY_REMOVAL_DECISION_REASON_LENGTH
    );
  }

  /** The reasons diners gave, most given first, as `[reason, count]`. */
  reasonCounts(
    removal: DietaryLabelRemovalEntry,
  ): [DietaryDisputeReason, number][] {
    return DIETARY_DISPUTE_REASONS.map(
      (reason) =>
        [reason, removal.reasons?.[reason] ?? 0] as [
          DietaryDisputeReason,
          number,
        ],
    )
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1]);
  }

  decide(removalId: string, decision: 'restore' | 'confirm'): void {
    if (this.canDecide(removalId)) {
      this.answer.emit({
        removalId,
        decision,
        reason: this.reasonOf(removalId).trim(),
      });
    }
  }
}
