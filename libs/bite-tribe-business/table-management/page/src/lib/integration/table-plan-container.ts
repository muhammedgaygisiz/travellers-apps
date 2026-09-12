import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TablePlanComponent } from '../component/table-plan.component';
import { TablePlanService } from './table-plan.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TablePlanComponent],
  template: `
    <bt-business-table-plan
      class="ion-page"
      [rooms]="service.roomsValue()"
      [selectedRoom]="service.selectedRoom()"
      [restaurantName]="service.restaurantName()"
      [loading]="service.loading()"
      [loadFailed]="service.loadFailed()"
      [isLive]="service.isLive()"
      [items]="service.items()"
      [selectedIds]="service.selectedIds()"
      [summary]="service.summary()"
      [roomTableCount]="service.roomTableCount()"
      [selectedTable]="service.selectedTable()"
      [actionTarget]="service.actionTarget()"
      [actions]="service.actions()"
      [bulkMode]="service.bulkMode()"
      [selectedCount]="service.selectedCount()"
      [freeableCount]="service.freeableCount()"
      [bulkBusy]="service.bulkBusy()"
      [isAuthenticated]="service.isAuthenticated()"
      (selectRoom)="service.selectRoom($event)"
      (selectionChange)="service.select($event)"
      (activateTable)="service.activateTable($event)"
      (clearSelection)="service.clearSelection()"
      (actionPicked)="service.applyAction($event)"
      (actionsDismissed)="service.closeActions()"
      (bulkModeToggled)="service.toggleBulkMode()"
      (selectAllRequested)="service.selectAllInRoom()"
      (freeSelected)="service.freeSelectedTables()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class TablePlanContainer {
  service = inject(TablePlanService);
}
