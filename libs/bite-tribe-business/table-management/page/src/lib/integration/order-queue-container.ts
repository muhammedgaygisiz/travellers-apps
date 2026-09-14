import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  OrderActionRequest,
  OrderQueueComponent,
} from '../component/order-queue.component';
import { OrderQueueService } from './order-queue.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OrderQueueComponent],
  template: `
    <bt-business-order-queue
      class="ion-page"
      [groups]="service.groups()"
      [openCount]="service.openCount()"
      [assistance]="service.assistance()"
      [busyAssistanceId]="service.busyAssistanceId()"
      [waiting]="service.waitingParties()"
      [anomalies]="service.anomalies()"
      [busyAnomalyId]="service.busyAnomalyId()"
      [loading]="service.loading()"
      [labelsFailed]="service.labelsFailed()"
      [liveStatus]="service.liveStatus()"
      [lastUpdated]="service.lastUpdated()"
      [busyOrderId]="service.busyOrderId()"
      [pendingCancellation]="service.pendingCancellation()"
      [alertEnabled]="service.alertEnabled()"
      [justArrived]="service.justArrived()"
      [isAuthenticated]="service.isAuthenticated()"
      (actionPicked)="pick($event)"
      (assistanceAcknowledged)="service.acknowledge($event)"
      (anomalyDismissed)="service.dismissAnomaly($event)"
      (cancellationConfirmed)="service.confirmCancellation($event)"
      (cancellationDismissed)="service.dismissCancellation()"
      (alertToggled)="service.toggleAlert()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class OrderQueueContainer {
  service = inject(OrderQueueService);

  pick({ group, order, action }: OrderActionRequest): void {
    void this.service.pick(group, order.id, action, order.status);
  }
}
