import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton, IonTextarea } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { MAX_CANCELLATION_REASON } from '../integration/order-queue-groups';
import type { PendingCancellation } from '../integration/order-queue.service';

/**
 * The one queue action that asks before it acts (GitHub issue #1105).
 *
 * Its own component beside the queue, as the action sheet of issue #1094 sits
 * beside the table plan: a modal has its own focus, its own escape and its own
 * piece of state - the sentence somebody is part way through typing - and none
 * of those belong to the list behind it.
 *
 * The rule it exists to keep is that a cancellation is explained rather than
 * silent (`RD-TS-16`). `transitionTableOrderStatus` refuses one with no reason,
 * and this is what stops that refusal ever being what a kitchen sees: the send
 * button is out of reach until the field holds something other than spaces.
 *
 * It holds no decision about *which* orders may be cancelled. That comes from
 * the transition matrix through `order-queue-groups.ts`, so a dialog cannot be
 * opened for a move the backend would refuse.
 */
@Component({
  selector: 'bt-business-order-cancel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonTextarea, TranslocoPipe],
  templateUrl: './order-cancel.component.html',
  styleUrl: './order-cancel.component.scss',
})
export class OrderCancelComponent {
  /** What is being cancelled, and which table the guest is at. */
  readonly pending = input.required<PendingCancellation>();

  readonly confirmed = output<string>();
  readonly dismissed = output<void>();

  readonly maxReason = MAX_CANCELLATION_REASON;

  /** What has been typed so far. */
  readonly reason = signal('');

  /** Whether the dialog may send. */
  readonly reasonGiven = computed(() => this.reason().trim().length > 0);

  onReason(value: string | null | undefined): void {
    this.reason.set(value ?? '');
  }

  confirm(): void {
    const reason = this.reason().trim();

    if (!reason) {
      return;
    }

    this.confirmed.emit(reason);
  }
}
