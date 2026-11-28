import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
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
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  dietaryApprovalKey,
  type AnswerDietaryLabelApprovalRequest,
  type DietaryLabel,
  type DietaryLabelApprovalEntry,
  type DietaryLabelKind,
} from 'model';

/** One waiting label of one dish, as the list renders it. */
interface PendingRow {
  readonly menuItemId: string;
  readonly label: DietaryLabel;
  readonly kind: DietaryLabelKind;
}

/**
 * The dietary labels waiting for an operator (GitHub issue #2198): one card
 * per restaurant at the strike limit, one row per label it asked to publish,
 * and Approve or Refuse on each. An approved label is published on the dish;
 * a refused one is dropped.
 */
@Component({
  selector: 'lib-dietary-label-approvals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
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
    TranslocoPipe,
  ],
  templateUrl: './dietary-label-approvals.html',
  styles: `
    /* The measure every other operator list uses. */
    .dietary-label-approvals {
      margin: 0 auto;
      max-width: 40rem;
    }

    .answers {
      display: flex;
      gap: 0.25rem;
    }
  `,
})
export class DietaryLabelApprovals {
  readonly approvals = input<DietaryLabelApprovalEntry[]>([]);
  readonly loading = input(false);
  readonly failed = input(false);
  readonly answering = input<string | undefined>();

  readonly answer = output<AnswerDietaryLabelApprovalRequest>();
  readonly reload = output<void>();
  readonly logoutClick = output<void>();

  rowsOf(item: DietaryLabelApprovalEntry['items'][number]): PendingRow[] {
    return [
      ...item.labels.map((label) => ({
        menuItemId: item.menuItemId,
        label,
        kind: 'label' as const,
      })),
      ...item.options.map((label) => ({
        menuItemId: item.menuItemId,
        label,
        kind: 'option' as const,
      })),
    ];
  }

  isAnswering(restaurantId: string, row: PendingRow): boolean {
    return this.answering() === dietaryApprovalKey({ restaurantId, ...row });
  }

  respond(restaurantId: string, row: PendingRow, approve: boolean): void {
    if (!this.answering()) {
      this.answer.emit({ restaurantId, ...row, approve });
    }
  }
}
