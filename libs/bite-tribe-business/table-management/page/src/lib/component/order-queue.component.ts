import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonNote,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import type { AssistanceRow } from '../integration/assistance-rows';
import type {
  PendingSessionRow,
  ScanAnomalyRow,
} from '../integration/scan-signal-rows';
import type {
  OrderAction,
  OrderTableGroup,
  QueuedOrder,
} from '../integration/order-queue-groups';
import type {
  OrderQueueLiveStatus,
  PendingCancellation,
} from '../integration/order-queue.service';
import { OrderCancelComponent } from './order-cancel.component';

/** What the staff member asked to do to one order. */
export interface OrderActionRequest {
  group: OrderTableGroup;
  order: QueuedOrder;
  action: OrderAction;
}

/** How each connection state is drawn and named. The plan's four, verbatim. */
const LIVE_MARKS: Readonly<
  Record<OrderQueueLiveStatus, { icon: string; labelKey: string; tone: string }>
> = {
  connecting: {
    icon: 'time-outline',
    labelKey: 'table-plan-connecting',
    tone: 'waiting',
  },
  live: {
    icon: 'radio-button-on-outline',
    labelKey: 'table-plan-live',
    tone: 'live',
  },
  offline: {
    icon: 'cloud-offline-outline',
    labelKey: 'table-plan-offline',
    tone: 'offline',
  },
  stale: {
    icon: 'warning-outline',
    labelKey: 'table-plan-stale',
    tone: 'stale',
  },
};

/**
 * The incoming order queue (GitHub issue #1105).
 *
 * ## Why the whole ticket is on the row
 *
 * Because the alternative is a kitchen tapping a row to find out what to cook.
 * A queue of collapsed summaries is readable on a phone and useless at a pass,
 * where the screen is at arm's length and the person reading it has both hands
 * full - so every line, every variant and every note the guest typed is printed
 * on the row, and the only thing a press does is move the order along.
 *
 * ## Why the buttons are given to it
 *
 * The actions come in already filtered to the legal moves, derived from the
 * matrix by `order-queue-groups.ts`. A component that decided which buttons to
 * show would be a second copy of the order lifecycle, and the copy that drifts
 * is the one that offers a button the backend then refuses. This decides how
 * they look, and nothing else.
 *
 * ## The cancellation dialog is a component of its own
 *
 * `OrderCancelComponent`, beside this one as the action sheet of issue #1094
 * sits beside the table plan. A modal has its own focus and its own piece of
 * state - the sentence somebody is part way through typing - and neither
 * belongs to the list behind it.
 */
@Component({
  selector: 'bt-business-order-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonBadge,
    IonButton,
    IonContent,
    IonIcon,
    IonNote,
    IonSpinner,
    IonToggle,
    OrderCancelComponent,
    PageComponent,
    TranslocoPipe,
  ],
  templateUrl: './order-queue.component.html',
  styleUrl: './order-queue.component.scss',
})
export class OrderQueueComponent {
  readonly groups = input<OrderTableGroup[]>([]);
  readonly openCount = input(0);

  /**
   * The tables waiting for somebody, longest first (GitHub issue #1106).
   *
   * A list of its own above the tickets rather than a row inside a table's
   * group, and that is the point: a guest can call for a waiter having ordered
   * nothing, so a signal folded into the order groups would be invisible at
   * exactly the tables that have nothing else on the screen.
   */
  readonly assistance = input<AssistanceRow[]>([]);

  /** The signal whose press has not been answered yet, if any. */
  readonly busyAssistanceId = input<string | undefined>(undefined);

  /**
   * The guests who have scanned and are waiting to be seated
   * (GitHub issue #1107).
   *
   * Above the tables that are calling, because a guest at the door has nothing
   * yet - no table, no menu they can order from, and no way to ask for a waiter,
   * since `requestTableAssistance` refuses a `pending` session. Everything that
   * screen can do for them is done by somebody walking over.
   *
   * It is deliberately **not** in the anomaly list below. Two guests waiting at
   * table 12 is the flow working; putting it among the rows about codes being
   * hammered would make the ordinary case look like an incident, which is the
   * reliable way to get a list stopped being read.
   */
  readonly waiting = input<PendingSessionRow[]>([]);

  /** What the restaurant is told about its own codes (GitHub issue #1107). */
  readonly anomalies = input<ScanAnomalyRow[]>([]);

  /** The anomaly whose press has not been answered yet, if any. */
  readonly busyAnomalyId = input<string | undefined>(undefined);
  readonly loading = input(false);
  readonly labelsFailed = input(false);
  readonly liveStatus = input<OrderQueueLiveStatus>('connecting');
  readonly lastUpdated = input<string | undefined>(undefined);
  readonly restaurantName = input('');

  /** The order whose press has not been answered yet, if any. */
  readonly busyOrderId = input<string | undefined>(undefined);

  /** The cancellation waiting for its reason, if any. */
  readonly pendingCancellation = input<PendingCancellation | undefined>(
    undefined,
  );

  readonly alertEnabled = input(false);

  /** True for one tick after an order arrives. The visual half of the alert. */
  readonly justArrived = input(false);

  readonly isAuthenticated = input(false);

  readonly actionPicked = output<OrderActionRequest>();
  readonly assistanceAcknowledged = output<AssistanceRow>();
  readonly anomalyDismissed = output<ScanAnomalyRow>();
  readonly cancellationConfirmed = output<string>();
  readonly cancellationDismissed = output<void>();
  readonly alertToggled = output<void>();
  readonly logoutClick = output<void>();

  readonly live = computed(() => LIVE_MARKS[this.liveStatus()]);

  readonly hasOrders = computed(() => this.groups().length > 0);

  /** Whether any table is calling, which is what draws the list at all. */
  readonly hasAssistance = computed(() => this.assistance().length > 0);

  /** Whether anybody is waiting to be seated. */
  readonly hasWaiting = computed(() => this.waiting().length > 0);

  /** Whether the restaurant has anything to read about its codes. */
  readonly hasAnomalies = computed(() => this.anomalies().length > 0);

  pick(group: OrderTableGroup, order: QueuedOrder, action: OrderAction): void {
    this.actionPicked.emit({ group, order, action });
  }

  acknowledge(row: AssistanceRow): void {
    this.assistanceAcknowledged.emit(row);
  }

  dismiss(row: ScanAnomalyRow): void {
    this.anomalyDismissed.emit(row);
  }
}
