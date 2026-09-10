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
      [selectedRoom]="service.selectedRoom()"
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
      [unsavedChanges]="service.unsavedChanges()"
      [isAuthenticated]="service.isAuthenticated()"
      (selectRoom)="service.selectRoom($event)"
      (createRoom)="service.createRoom($event)"
      (saveRoom)="service.saveRoom($event)"
      (deleteRoom)="service.deleteRoom($event)"
      (gridSpacingChange)="service.setGridSpacing($event)"
      (snapChange)="service.setSnapEnabled($event)"
      (placeRequest)="service.place($event)"
      (selectionChange)="service.select($event)"
      (itemsChange)="service.applyItems($event)"
      (commandRequest)="service.runCommand($event)"
      (resizeSelected)="service.resizeSelected($event)"
      (rotateSelected)="service.rotateSelected($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class FloorPlanContainer {
  service = inject(FloorPlanService);
}
