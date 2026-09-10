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
      [isAuthenticated]="service.isAuthenticated()"
      (selectRoom)="service.selectRoom($event)"
      (createRoom)="service.createRoom($event)"
      (saveRoom)="service.saveRoom($event)"
      (deleteRoom)="service.deleteRoom($event)"
      (gridSpacingChange)="service.setGridSpacing($event)"
      (snapChange)="service.setSnapEnabled($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class FloorPlanContainer {
  service = inject(FloorPlanService);
}
