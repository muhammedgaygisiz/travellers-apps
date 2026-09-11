import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FloorPlanComponent } from '../component/floor-plan.component';
import { FloorPlanService } from './floor-plan.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FloorPlanComponent],
  template: `
    <bt-business-floor-plan
      class="ion-page"
      [rooms]="service.roomsValue()"
      [selectedRoom]="service.editedRoom()"
      [publishedRoom]="service.readyRoom()"
      [formSeed]="service.formSeed()"
      [restaurantName]="service.restaurantName()"
      [loading]="service.loading()"
      [loadFailed]="service.loadFailed()"
      [saving]="service.saving()"
      [gridSpacing]="service.gridSpacing()"
      [snapEnabled]="service.snapEnabled()"
      [snapSpacing]="service.snapSpacing()"
      [items]="service.items()"
      [selectedIds]="service.selectedIds()"
      [canUndo]="service.canUndo()"
      [canRedo]="service.canRedo()"
      [unpublishedChanges]="service.unpublishedChanges()"
      [autosaveStatus]="service.autosaveStatus()"
      [draftSavedAt]="service.draftSavedAt()"
      [hasDraft]="service.hasDraft()"
      [validation]="service.validation()"
      [changeSummary]="service.changeSummary()"
      [canPublish]="service.canPublish()"
      [selectedTable]="service.selectedTable()"
      [selectedTableCount]="service.selectedTables().length"
      [labelConflict]="service.labelConflict()"
      [labelConflictRoom]="service.labelConflictRoom()"
      [roomCapacities]="service.roomCapacities()"
      [restaurantCapacity]="service.restaurantCapacity()"
      [isAuthenticated]="service.isAuthenticated()"
      (selectRoom)="service.selectRoom($event)"
      (createRoom)="service.createRoom($event)"
      (roomFieldsChange)="service.setRoomFields($event)"
      (publish)="service.publish()"
      (discardDraft)="service.discardDraft()"
      (showIssue)="service.showIssue($event)"
      (deleteRoom)="service.deleteRoom($event)"
      (moveRoom)="service.moveRoom($event.roomId, $event.offset)"
      (gridSpacingChange)="service.setGridSpacing($event)"
      (snapChange)="service.setSnapEnabled($event)"
      (placeRequest)="service.place($event)"
      (selectionChange)="service.select($event)"
      (itemsChange)="service.applyItems($event)"
      (commandRequest)="service.runCommand($event)"
      (resizeSelected)="service.resizeSelected($event)"
      (rotateSelected)="service.rotateSelected($event)"
      (renameTable)="service.renameTable($event)"
      (tableSeatsChange)="service.setTableSeats($event)"
      (tableShapeChange)="service.setTableShape($event)"
      (tableEnabledChange)="service.setTableEnabled($event)"
      (numberTables)="service.numberSelection($event)"
      (moveTable)="service.moveSelectedTableToRoom($event)"
      (printQrCodes)="service.gotoQrCodes()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class FloorPlanContainer {
  service = inject(FloorPlanService);
}
